import { Request, Response } from "express";
import { WhatsAppService } from "../../application/services/WhatsAppService";
import { IUazapWebhookPayload } from "../../external/whatsapp/interfaces/IWhatsApp";

const whatsAppService = new WhatsAppService();

export class WhatsAppController {
  async sendOtp(req: Request, res: Response): Promise<void> {
    try {
      const phone = await whatsAppService.sendOtp(req.user!.slug);
      res.json({ message: `Código enviado para ${phone} via WhatsApp` });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body as { code: string };
      if (!code) {
        res.status(400).json({ message: "code é obrigatório" });
        return;
      }
      await whatsAppService.verifyOtp(req.user!.slug, code);
      res.json({ message: "WhatsApp vinculado com sucesso!" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async webhook(req: Request, res: Response): Promise<void> {
    res.sendStatus(200);
    const payload = req.body as IUazapWebhookPayload;
    const m = payload?.message;
    const typeStr = `${m?.messageType ?? ""} ${m?.type ?? ""} ${m?.mediaType ?? ""}`.toLowerCase();
    const isAudio = typeStr.includes("audio") || typeStr.includes("ptt") || (m?.mimetype ?? "").toLowerCase().includes("audio");
    if ((!m?.text && !isAudio) || m.fromMe || m.wasSentByApi || m.isGroup) return;
    whatsAppService.handleWebhook(payload).catch((err) => {
      console.error("[webhook] Erro:", err.message);
    });
  }
}
