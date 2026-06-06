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

    const phone   = data.from.replace(/\D/g, "").replace(/^55/, "");
    const content = data.body?.trim();
    if (!content) return;

    const isAudio = data.type === "audio" || data.mimetype?.includes("audio");

    const conversation = await Conversation.findOneAndUpdate(
      { phoneNumber: data.from },
      { lastMessageAt: new Date() },
      { upsert: true, new: true }
    );

    await Message.create({
      conversationId: conversation._id,
      phoneNumber: data.from,
      userSlug: conversation.userSlug,
      direction: "inbound",
      type: isAudio ? "audio" : "text",
      content,
      rawPayload: data as unknown as Record<string, unknown>,
      sentAt: new Date(data.timestamp * 1000),
    });

    if (conversation.status !== "active") {
      await this.uazap.sendText(
        data.from,
        `Olá! Para conversar comigo você precisa vincular este número na plataforma.\n\nAcesse a plataforma → Configurações → "Vincular WhatsApp".`
      );
      return;
    }

    const aiReply = this.ai
      ? await this.ai.generateReply(conversation._id, content)
      : "Olá! Recebi sua mensagem. Em breve a Vanderleia estará disponível para te ajudar! 🌾";

    await Message.create({
      conversationId: conversation._id,
      phoneNumber: data.from,
      userSlug: conversation.userSlug,
      direction: "outbound",
      type: "text",
      content: aiReply,
      sentAt: new Date(),
    });

    await this.uazap.sendText(data.from, aiReply);
  }
}
