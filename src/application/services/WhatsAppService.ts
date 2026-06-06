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

export class WhatsAppService {
  private otpService     = new OtpService();
  private uazap          = new UazapService();
  private ai             = process.env.OPENAI_API_KEY ? new AiService() : null;
  private transcription  = process.env.OPENAI_API_KEY ? new TranscriptionService() : null;

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
    const { chat, message } = payload;

    if (message.fromMe || message.wasSentByApi) return;

    const phone   = normalizePhone(chat.wa_chatid.replace("@s.whatsapp.net", ""));
    const replyTo = chat.wa_chatid.replace("@s.whatsapp.net", "");

    const isAudio = message.type === "audio" || message.mediaType === "audio";

    // Para texto, extrai o conteúdo bruto agora; para áudio, será preenchido após transcrição
    let content = isAudio ? "" : (message.text || message.content || "").trim();
    let transcribedText: string | null = null;

    if (!isAudio && !content) return;

    // Deduplicação por messageId
    if (message.messageid && (await Message.exists({ messageId: message.messageid }))) {
      return;
    }

    const conversation = await Conversation.findOneAndUpdate(
      { phoneNumber: phone },
      { lastMessageAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    // Transcreve áudio antes de salvar a mensagem
    if (isAudio) {
      if (!this.transcription) {
        await this.uazap.sendText(replyTo, "⚠️ Transcrição de áudio não disponível no momento. Pode digitar sua mensagem?");
        return;
      }
      try {
        const audioBuffer = await this.uazap.downloadMedia({
          remoteJid: chat.wa_chatid,
          fromMe: message.fromMe,
          id: message.messageid,
        });
        transcribedText = await this.transcription.transcribe(audioBuffer, "audio/ogg");
        content = transcribedText;
        if (!content.trim()) {
          await this.uazap.sendText(replyTo, "Não consegui entender o áudio 🎙️ Pode repetir ou digitar?");
          return;
        }
      } catch (err: any) {
        console.error("[audio] Falha ao transcrever:", err.response?.data ?? err.message);
        await this.uazap.sendText(replyTo, "Tive um problema ao processar seu áudio 🙁 Tente digitar sua mensagem.");
        return;
      }
    }

    // Salva mensagem inbound (com transcrição no content para áudio)
    try {
      await Message.create({
        conversationId: conversation._id,
        messageId:      message.messageid,
        phoneNumber:    phone,
        userSlug:       conversation.userSlug,
        direction:      "inbound",
        type:           isAudio ? "audio" : "text",
        content,
        rawPayload:     message as unknown as Record<string, unknown>,
        sentAt:         new Date(message.messageTimestamp * 1000),
      });
    } catch (err: any) {
      if (err?.code === 11000) return; // duplicado por race condition
      throw err;
    }

    if (conversation.status !== "active") {
      await this.uazap.sendText(
        replyTo,
        `Olá, ${chat.name ?? "produtor"}! 👋\n\nPara conversar comigo você precisa vincular este número na plataforma.\n\nAcesse → Configurações → "Vincular WhatsApp".`
      );
      return;
    }

    // Gera resposta da IA (com detecção de transação via function calling)
    let aiReply: string;
    try {
      if (!this.ai) {
        aiReply = "Olá! Recebi sua mensagem. Em breve a Vanderleia estará disponível para te ajudar! 🌾";
      } else {
        const result = await this.ai.generateReply(conversation._id, content, conversation.userSlug);
        aiReply = result.reply;

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
