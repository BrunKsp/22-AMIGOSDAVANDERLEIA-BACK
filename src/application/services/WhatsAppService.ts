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
      `✅ Número vinculado com sucesso!\n\nOlá, *${user.name}*! Agora posso te ajudar aqui pelo WhatsApp. Como posso ajudar?`
    );
  }

  async handleWebhook(payload: IUazapWebhookPayload): Promise<void> {
    const { key, message, pushName, messageTimestamp } = payload.data;

    const remoteJid = key.remoteJid;
    const phone     = normalizePhone(remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", ""));
    const replyTo   = phone;

    const isAudio = !!message.audioMessage;
    let content = isAudio ? "" : (message.conversation || message.extendedTextMessage?.text || "").trim();

    if (!isAudio && !content) return;

    // Deduplicação por messageId
    if (key.id && (await Message.exists({ messageId: key.id }))) {
      return;
    }

    const conversation = await Conversation.findOneAndUpdate(
      { phoneNumber: phone },
      { lastMessageAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    // Transcreve áudio
    if (isAudio) {
      if (!this.transcription) {
        await this.uazap.sendText(replyTo, "⚠️ Transcrição de áudio não disponível no momento. Pode digitar sua mensagem?");
        return;
      }
      try {
        const audio    = message.audioMessage!;
        const mimetype = audio.mimetype?.split(";")[0] ?? "audio/ogg";
        let audioBuffer: Buffer;

        audioBuffer = await this.uazap.downloadMedia({
          remoteJid,
          fromMe: key.fromMe,
          id:     key.id,
        });

        console.log(`[audio] Buffer obtido: ${audioBuffer.length} bytes, mimetype: ${mimetype}`);

        const transcribedText = await this.transcription.transcribe(audioBuffer, mimetype);
        content = transcribedText.trim();

        if (!content) {
          await this.uazap.sendText(replyTo, "Não consegui entender o áudio 🎙️ Pode repetir ou digitar?");
          return;
        }

        console.log(`[audio] Transcrição: "${content}"`);
      } catch (err: any) {
        console.error("[audio] Falha ao processar áudio:", err.response?.data ?? err.message);
        await this.uazap.sendText(replyTo, "Tive um problema ao processar seu áudio 🙁 Tente digitar sua mensagem.");
        return;
      }
    }

    // Salva mensagem inbound
    try {
      await Message.create({
        conversationId: conversation._id,
        messageId:      key.id,
        phoneNumber:    phone,
        userSlug:       conversation.userSlug,
        direction:      "inbound",
        type:           isAudio ? "audio" : "text",
        content,
        rawPayload:     payload.data as unknown as Record<string, unknown>,
        sentAt:         messageTimestamp ? new Date(messageTimestamp * 1000) : new Date(),
      });
    } catch (err: any) {
      if (err?.code === 11000) return;
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
          `Olá, ${pushName ?? "produtor"}! 👋\n\nPara conversar comigo você precisa vincular este número na plataforma.\n\nAcesse → Configurações → "Vincular WhatsApp".`
        );
        return;
      }
    }

    // Gera resposta da IA
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

    // Salva resposta outbound
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
