import { AppDataSource } from "../../config/database";
import { User } from "../../data/Infra.PG/User";
import { OtpService } from "./OtpService";
import { UazapService } from "../../external/whatsapp/services/UazapService";
import { AiService } from "../../external/whatsapp/services/AiService";
import { TranscriptionService } from "../../external/whatsapp/services/TranscriptionService";
import { Conversation } from "../../data/Infra.Documents/Conversation";
import { Message } from "../../data/Infra.Documents/Message";
import { Transaction } from "../../data/Infra.Documents/Transaction";
import { IUazapWebhookPayload } from "../../external/whatsapp/interfaces/IWhatsApp";
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
      `✅ Número vinculado com sucesso!\n\nOlá, *${user.name}*! Eu sou a *Vanderleia*, sua assistente do *Guiar* 🌱\n\nPode me mandar suas despesas e receitas por texto ou áudio que eu organizo tudo pra você. Como posso ajudar?`
    );
  }

  async handleWebhook(payload: IUazapWebhookPayload): Promise<void> {
    const { chat, message } = payload;

    if (message.fromMe || message.wasSentByApi) return;

    const phone   = normalizePhone(chat.wa_chatid.replace("@s.whatsapp.net", ""));
    const replyTo = chat.wa_chatid.replace("@s.whatsapp.net", "");

    const typeStr = `${message.messageType ?? ""} ${message.type ?? ""} ${message.mediaType ?? ""}`.toLowerCase();
    const isAudio = typeStr.includes("audio") || typeStr.includes("ptt") || (message.mimetype ?? "").toLowerCase().includes("audio");

    // Para texto, o conteúdo já vem agora; para áudio é preenchido após a transcrição.
    let content = isAudio ? "" : (message.text || message.content || "").trim();

    if (!isAudio && !content) return;

    // Deduplicação rápida por messageId
    if (message.messageid && (await Message.exists({ messageId: message.messageid }))) {
      return;
    }

    const conversation = await Conversation.findOneAndUpdate(
      { phoneNumber: phone },
      { lastMessageAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    // Mostra "digitando..." enquanto processa. Cancelado ao enviar a resposta.
    await this.uazap.sendPresence(replyTo, "composing");

    // Reserva a mensagem ANTES de transcrever: o índice único do messageId evita
    // corrida e transcrição em dobro caso o webhook chegue mais de uma vez.
    let inbound;
    try {
      inbound = await Message.create({
        conversationId: conversation._id,
        messageId:      message.messageid,
        phoneNumber:    phone,
        userSlug:       conversation.userSlug,
        direction:      "inbound",
        type:           isAudio ? "audio" : "text",
        content:        isAudio ? "[áudio]" : content,
        rawPayload:     message as unknown as Record<string, unknown>,
        // messageTimestamp pode vir em segundos (~1.7e9) ou milissegundos (~1.7e12).
        // Esta instância do Uazapi manda em ms; multiplicar por 1000 gerava datas no
        // ano ~58000. Normaliza para ms antes de criar a Date.
        sentAt:         message.messageTimestamp
          ? new Date(message.messageTimestamp < 1e12 ? message.messageTimestamp * 1000 : message.messageTimestamp)
          : new Date(),
      });
    } catch (err: any) {
      if (err?.code === 11000) return; // duplicado / corrida
      throw err;
    }

    // Confere o vínculo do número ANTES de gastar transcrição/IA.
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
          `Olá, ${chat.name ?? "produtor"}! 👋\n\nPara conversar comigo você precisa vincular este número na plataforma.\n\nAcesse → Configurações → "Vincular WhatsApp".`
        );
        return;
      }
    }

    // Transcreve o áudio (já com vínculo confirmado) e atualiza o conteúdo salvo.
    if (isAudio) {
      if (!this.transcription) {
        await this.uazap.sendText(replyTo, "⚠️ Transcrição de áudio não disponível no momento. Pode digitar sua mensagem?");
        return;
      }
      try {
        // Áudio já descriptografado e convertido em MP3 pelo Uazapi
        // (não usar a URL .enc crua do WhatsApp — vem criptografada).
        const audioBuffer = await this.uazap.downloadMedia(message.messageid);
        console.log(`[audio] Buffer obtido: ${audioBuffer.length} bytes (id=${message.messageid})`);

        content = (await this.transcription.transcribe(audioBuffer, "audio/mpeg")).trim();

        if (!content) {
          await this.uazap.sendText(replyTo, "Não consegui entender o áudio 🎙️ Pode repetir ou digitar?");
          return;
        }

        inbound.content = content;
        await inbound.save();
        console.log(`[audio] Transcrição: "${content}"`);
      } catch (err: any) {
        console.error("[audio] Falha ao processar áudio:", err.response?.data ?? err.message);
        await this.uazap.sendText(replyTo, "Tive um problema ao processar seu áudio 🙁 Tente digitar sua mensagem.");
        return;
      }
    }

    // Gera resposta da IA (com detecção de transação via function calling)
    let aiReply: string;
    try {
      if (!this.ai) {
        aiReply = "Olá! Recebi sua mensagem. Em breve a Vanderleia estará disponível para te ajudar! 🌾";
      } else {
        // Apelido salvo na conversa tem prioridade sobre o nome do cadastro.
        let userName: string | undefined = conversation.preferredName ?? undefined;
        if (!userName && conversation.userSlug) {
          const pgUser = await this.userRepository.findBySlug(conversation.userSlug);
          userName = pgUser?.name;
        }

        const result = await this.ai.generateReply(conversation._id, content, conversation.userSlug, userName);
        aiReply = result.reply;

        // Persiste o apelido se o produtor pediu para ser chamado de outro jeito.
        if (result.preferredName && result.preferredName !== conversation.preferredName) {
          await Conversation.findByIdAndUpdate(conversation._id, { preferredName: result.preferredName });
        }

        // Salva transação extraída pela IA
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
      try {
        await this.uazap.sendText(replyTo, "Tive uma instabilidade aqui agora 🙈 Pode mandar de novo daqui a pouquinho?");
      } catch { /* ignora falha no envio do aviso */ }
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
}
