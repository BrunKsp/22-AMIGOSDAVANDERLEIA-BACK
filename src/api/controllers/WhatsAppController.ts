import { Request, Response } from "express";
import { WhatsAppService } from "../../application/services/WhatsAppService";
import { IUazapWebhookPayload } from "../../external/whatsapp/interfaces/IWhatsApp";
import { parseInbound } from "../../external/whatsapp/utils/parseInbound";

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
    if (!payload?.data) return;

    // Loga o payload bruto uma única vez por mensagem para diagnóstico do shape real.
    console.log("[webhook] event:", payload.event, "| data:", JSON.stringify(payload.data));

    const inbound = parseInbound(payload.data);

    // Só processa mensagens recebidas de pessoas (texto ou áudio), nunca as nossas.
    if (inbound.fromMe || inbound.wasSentByApi || inbound.isGroup) return;
    if (!inbound.isAudio && !inbound.text) return;

    whatsAppService.handleWebhook(payload).catch((err) => {
      console.error("[webhook] Erro:", err.response?.data ?? err.message);
    });
  }
}
