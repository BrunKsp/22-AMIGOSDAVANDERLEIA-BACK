import { AppDataSource } from "../../config/database";
import { User } from "../../data/Infra.PG/User";
import { OtpService } from "./OtpService";
import { UazapService } from "../../external/whatsapp/services/UazapService";
import { AiService } from "../../external/whatsapp/services/AiService";
import { TranscriptionService } from "../../external/whatsapp/services/TranscriptionService";
import { Conversation } from "../../data/Infra.Documents/Conversation";
import { Message } from "../../data/Infra.Documents/Message";
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

    const phone   = normalizePhone(chat.wa_chatid.replace("@s.whatsapp.net", ""));
    const replyTo = chat.wa_chatid.replace("@s.whatsapp.net", "");
    const content = (message.text || message.content || "").trim();
    if (!content) return;

    // Deduplicação rápida: a UazAPI reenvia o mesmo evento mais de uma vez
    if (message.messageid && (await Message.exists({ messageId: message.messageid }))) {
      return;
    }

    const isAudio = message.type === "audio" || message.mediaType === "audio";

    const conversation = await Conversation.findOneAndUpdate(
      { phoneNumber: phone },
      { lastMessageAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    // O índice único em messageId garante que dois webhooks simultâneos
    // não gerem resposta duplicada (race condition).
    try {
      await Message.create({
        conversationId: conversation._id,
        messageId: message.messageid,
        phoneNumber: phone,
        userSlug: conversation.userSlug,
        direction: "inbound",
        type: isAudio ? "audio" : "text",
        content,
        rawPayload: message as unknown as Record<string, unknown>,
        sentAt: new Date(message.messageTimestamp),
      });
    } catch (err: any) {
      if (err?.code === 11000) return; // duplicado: outro webhook já processou
      throw err;
    }

    if (conversation.status !== "active") {
      await this.uazap.sendText(
        replyTo,
        `Olá, ${chat.name ?? "produtor"}! 👋\n\nPara conversar comigo você precisa vincular este número na plataforma.\n\nAcesse → Configurações → "Vincular WhatsApp".`
      );
      return;
    }

    let aiReply: string;
    try {
      aiReply = this.ai
        ? await this.ai.generateReply(conversation._id, content)
        : "Olá! Recebi sua mensagem. Em breve a Vanderleia estará disponível para te ajudar! 🌾";
    } catch (err: any) {
      console.error("[ai] Erro ao gerar resposta:", err.response?.data ?? err.message);
      return;
    }

    await Message.create({
      conversationId: conversation._id,
      phoneNumber: phone,
      userSlug: conversation.userSlug,
      direction: "outbound",
      type: "text",
      content: aiReply,
      sentAt: new Date(),
    });

    try {
      await this.uazap.sendText(replyTo, aiReply);
    } catch (err: any) {
      console.error("[uazap] Erro ao enviar mensagem:", err.response?.data ?? err.message);
    }
  }
}
