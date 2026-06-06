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
    const body = req.body;
    console.log("[webhook]", JSON.stringify(body).slice(0, 400));

    const dataList = Array.isArray(body?.data) ? body.data : [body?.data];
    for (const data of dataList) {
      if (!data) continue;
      whatsAppService.handleWebhook({ event: body.event, instance: body.instance, data })
        .catch((err) => console.error("[webhook] Erro:", err.message));
    }
  }
}
