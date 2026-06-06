import { AppDataSource } from "../../config/database";
import { User } from "../../data/Infra.PG/User";
import { OtpService } from "./OtpService";
import { UazapService } from "../../external/whatsapp/services/UazapService";
import { AiService } from "../../external/whatsapp/services/AiService";
import { TranscriptionService } from "../../external/whatsapp/services/TranscriptionService";
import { Conversation } from "../../data/Infra.Documents/Conversation";
import { Message } from "../../data/Infra.Documents/Message";
import { Transaction } from "../../data/Infra.Documents/Transaction";
import { IUazapWebhookPayload, IInboundMessage } from "../../external/whatsapp/interfaces/IWhatsApp";
import { parseInbound } from "../../external/whatsapp/utils/parseInbound";
import { normalizePhone } from "../../shared/utils/normalizePhone";
import { UserRepository } from "../../infra/repositories/UserRepository";

export class WhatsAppService {
  private otpService     = new OtpService();
  private uazap          = new UazapService();
  private userRepository = new UserRepository();
  private _ai:           AiService | null = null;
  private _transcription: TranscriptionService | null = null;

  private get ai(): AiService | null {
    if (!this._ai && process.env.OPENAI_API_KEY) {
      this._ai = new AiService();
    }
    return this._ai;
  }

  private get transcription(): TranscriptionService | null {
    if (!this._transcription && process.env.OPENAI_API_KEY) {
      this._transcription = new TranscriptionService();
    }
    return this._transcription;
  }

  async sendOtp(userSlug: string): Promise<string> {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ slug: userSlug });
    if (!user) throw new Error("Usuário não encontrado");
    if (user.phoneVerified) throw new Error("Número já verificado");
    if (!user.phone) throw new Error("Nenhum telefone cadastrado no perfil");

    await this.otpService.sendOtp(user.phone, userSlug);
    return user.phone;
  }

  async verifyOtp(userSlug: string, code: string): Promise<void> {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ slug: userSlug });
    if (!user) throw new Error("Usuário não encontrado");

    await this.otpService.verifyOtp(user.phone, code);
    await userRepo.update({ slug: userSlug }, { phoneVerified: true });

    const phoneNorm = normalizePhone(user.phone);
    await Conversation.findOneAndUpdate(
      { phoneNumber: phoneNorm },
      { userSlug, status: "active", lastMessageAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    await this.uazap.sendText(
      user.phone,
      `✅ Número vinculado com sucesso!\n\nOlá, *${user.name}*! Agora posso te ajudar aqui pelo WhatsApp. Como posso ajudar?`
    );
  }

  async handleWebhook(payload: IUazapWebhookPayload): Promise<void> {
    const inbound = parseInbound(payload.data ?? {});

    if (inbound.fromMe || inbound.wasSentByApi || inbound.isGroup) return;
    if (!inbound.phone) return;

    const phone   = normalizePhone(inbound.phone);
    const replyTo = inbound.phone;

    // Para texto já temos o conteúdo; para áudio será preenchido após transcrição.
    let content = inbound.isAudio ? "" : inbound.text;
    if (!inbound.isAudio && !content) return;

    // Deduplicação por messageId
    if (inbound.messageId && (await Message.exists({ messageId: inbound.messageId }))) {
      return;
    }

    const conversation = await Conversation.findOneAndUpdate(
      { phoneNumber: phone },
      { lastMessageAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    // ── Transcrição de áudio ──────────────────────────────────
    if (inbound.isAudio) {
      try {
        content = await this.resolveAudioText(inbound);
      } catch (err: any) {
        console.error("[audio] Falha ao processar áudio:", err.response?.data ?? err.message);
        await this.uazap.sendText(replyTo, "Tive um problema ao processar seu áudio 🙁 Pode tentar de novo ou me mandar por texto?");
        return;
      }

      if (!content) {
        await this.uazap.sendText(replyTo, "Não consegui entender o áudio 🎙️ Pode repetir ou me mandar por texto?");
        return;
      }
      console.log(`[audio] Transcrição: "${content}"`);
    }

    // Salva mensagem inbound (com transcrição no content para áudio)
    try {
      await Message.create({
        conversationId: conversation._id,
        messageId:      inbound.messageId,
        phoneNumber:    phone,
        userSlug:       conversation.userSlug,
        direction:      "inbound",
        type:           inbound.isAudio ? "audio" : "text",
        content,
        rawPayload:     payload.data as unknown as Record<string, unknown>,
        sentAt:         inbound.sentAt,
      });
    } catch (err: any) {
      if (err?.code === 11000) return; // duplicado por race condition
      throw err;
    }

    if (conversation.status !== "active") {
      const pgUser = await this.userRepository.findByPhone(phone);

      console.log(`[webhook] status=${conversation.status} phone=${phone} pgUser=${pgUser?.slug ?? "null"} phoneVerified=${pgUser?.phoneVerified ?? "null"}`);

      if (pgUser?.phoneVerified) {
        await Conversation.findOneAndUpdate(
          { phoneNumber: phone },
          { userSlug: pgUser.slug, status: "active" }
        );
        conversation.status   = "active";
        conversation.userSlug = pgUser.slug;
      } else {
        await this.uazap.sendText(
          replyTo,
          `Olá, ${inbound.senderName ?? "produtor"}! 👋\n\nPara conversar comigo você precisa vincular este número na plataforma.\n\nAcesse → Configurações → "Vincular WhatsApp".`
        );
        return;
      }
    }

    // ── Gera resposta da IA (idêntico ao fluxo de texto) ──────
    let aiReply: string;
    try {
      if (!this.ai) {
        aiReply = "Olá! Recebi sua mensagem. Em breve a Vanderleia estará disponível para te ajudar! 🌾";
      } else {
        const result = await this.ai.generateReply(conversation._id, content, conversation.userSlug);
        aiReply = result.reply;

        if (result.transaction && conversation.userSlug) {
          try {
            await Transaction.create({
              userSlug:    conversation.userSlug,
              type:        result.transaction.type,
              description: result.transaction.description,
              value:       result.transaction.value,
              category:    result.transaction.category,
              date:        result.transaction.date,
              origin:      "whatsapp",
              rawMessage:  result.transaction.rawMessage,
            });
            console.log(`[transaction] Salva para ${conversation.userSlug}: ${result.transaction.type} R$${result.transaction.value}`);
          } catch (err: any) {
            console.error("[transaction] Erro ao salvar:", err.message);
          }
        }
      }
    } catch (err: any) {
      console.error("[ai] Erro ao gerar resposta:", err.response?.data ?? err.message);
      return;
    }

    // Salva resposta outbound no histórico
    await Message.create({
      conversationId: conversation._id,
      phoneNumber:    phone,
      userSlug:       conversation.userSlug,
      direction:      "outbound",
      type:           "text",
      content:        aiReply,
      sentAt:         new Date(),
    });

    // Envia resposta via WhatsApp
    try {
      await this.uazap.sendText(replyTo, aiReply);
    } catch (err: any) {
      console.error("[uazap] Erro ao enviar mensagem:", err.response?.data ?? err.message);
    }
  }

  /**
   * Obtém o texto de um áudio recebido.
   *
   * Estratégia (em ordem de preferência):
   *  1. Transcrição nativa do Uazapi (1 call: baixa, descriptografa e transcreve)
   *  2. Download do áudio em MP3 + Whisper próprio (TranscriptionService)
   *
   * Cada etapa tenta o id principal e, em caso de falha, o id alternativo,
   * já que o Uazapi expõe tanto o id interno quanto o id do provedor.
   */
  private async resolveAudioText(inbound: IInboundMessage): Promise<string> {
    const ids = [inbound.downloadId, inbound.altDownloadId].filter(Boolean) as string[];
    if (!ids.length) {
      throw new Error("Mensagem de áudio sem id para download");
    }

    const openaiKey = process.env.OPENAI_API_KEY;

    // 1) Transcrição nativa do Uazapi
    for (const id of ids) {
      try {
        const text = await this.uazap.transcribeAudio(id, openaiKey);
        if (text) {
          console.log(`[audio] Transcrito via Uazapi (id=${id})`);
          return text.trim();
        }
      } catch (err: any) {
        console.warn(`[audio] Transcrição nativa falhou (id=${id}):`, err.response?.data ?? err.message);
      }
    }

    // 2) Fallback: baixa o áudio e transcreve com nosso próprio Whisper
    if (!this.transcription) {
      throw new Error("Transcrição indisponível (OPENAI_API_KEY ausente) e Uazapi não transcreveu");
    }

    for (const id of ids) {
      try {
        const media = await this.uazap.downloadMedia(id);
        console.log(`[audio] Buffer obtido via Uazapi (id=${id}): ${media.buffer.length} bytes, ${media.mimetype}`);
        const text = await this.transcription.transcribe(media.buffer, media.mimetype);
        if (text.trim()) return text.trim();
      } catch (err: any) {
        console.warn(`[audio] Download/transcrição própria falhou (id=${id}):`, err.response?.data ?? err.message);
      }
    }

    return "";
  }
}
