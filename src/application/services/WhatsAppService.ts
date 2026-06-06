import { AppDataSource } from "../../config/database";
import { User } from "../../data/Infra.PG/User";
import { OtpService } from "./OtpService";
import { UazapService } from "../../external/whatsapp/services/UazapService";
import { AiService } from "../../external/whatsapp/services/AiService";
import { TranscriptionService } from "../../external/whatsapp/services/TranscriptionService";
import { Conversation } from "../../data/Infra.Documents/Conversation";
import { Message } from "../../data/Infra.Documents/Message";
import { IUazapWebhookPayload } from "../../external/whatsapp/interfaces/IWhatsApp";

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

    await Conversation.findOneAndUpdate(
      { phoneNumber: user.phone },
      { userSlug, status: "active", lastMessageAt: new Date() },
      { upsert: true, new: true }
    );

    await this.uazap.sendText(
      user.phone,
      `✅ Número vinculado com sucesso!\n\nOlá, *${user.name}*! Agora posso te ajudar aqui pelo WhatsApp. Como posso ajudar?`
    );
  }

  async handleWebhook(payload: IUazapWebhookPayload): Promise<void> {
    const { data } = payload;
    if (data.key.fromMe) return;

    const phone   = data.key.remoteJid.replace("@s.whatsapp.net", "");
    const content = await this.extractContent(payload);
    if (!content) return;

    const conversation = await Conversation.findOneAndUpdate(
      { phoneNumber: phone },
      { lastMessageAt: new Date() },
      { upsert: true, new: true }
    );

    const isAudio = !!payload.data.message?.audioMessage;

    await Message.create({
      conversationId: conversation._id,
      phoneNumber: phone,
      userSlug: conversation.userSlug,
      direction: "inbound",
      type: isAudio ? "audio" : "text",
      content,
      rawPayload: data as unknown as Record<string, unknown>,
      sentAt: new Date(data.messageTimestamp * 1000),
    });

    if (conversation.status !== "active") {
      await this.uazap.sendText(
        phone,
        `Olá! Para conversar comigo você precisa vincular este número na plataforma *Amigos da Vanderleia*.\n\nAcesse a plataforma → Perfil → "Vincular WhatsApp".`
      );
      return;
    }

    const aiReply = this.ai
      ? await this.ai.generateReply(conversation._id, content)
      : "Olá! Recebi sua mensagem. Em breve a Vanderleia estará disponível para te ajudar! 🌾";

    await Message.create({
      conversationId: conversation._id,
      phoneNumber: phone,
      userSlug: conversation.userSlug,
      direction: "outbound",
      type: "text",
      content: aiReply,
      sentAt: new Date(),
    });

    await this.uazap.sendText(phone, aiReply);
  }

  private async extractContent(payload: IUazapWebhookPayload): Promise<string> {
    const msg = payload.data.message;

    if (msg?.audioMessage) {
      if (!this.transcription) return "";
      try {
        const audioBuffer = await this.uazap.downloadMedia(payload.data.key);
        const mimetype = msg.audioMessage.mimetype ?? "audio/ogg";
        const transcribed = await this.transcription.transcribe(audioBuffer, mimetype);
        return transcribed.trim();
      } catch (err: any) {
        console.error("[transcription] Erro ao transcrever áudio:", err.message);
        return "";
      }
    }

    return (
      msg?.conversation ??
      msg?.extendedTextMessage?.text ??
      msg?.imageMessage?.caption ??
      ""
    );
  }
}
