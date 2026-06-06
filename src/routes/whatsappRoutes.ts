import { Router } from "express";
import { WhatsAppController } from "../api/controllers/WhatsAppController";
import { authenticate } from "../middlewares/authenticate";
import { rateLimit } from "../middlewares/rateLimit";

const router = Router();
const controller = new WhatsAppController();

const otpLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5, message: "Muitas solicitações de código. Aguarde alguns minutos." });

router.post("/send-otp",   authenticate, otpLimiter, (req, res) => controller.sendOtp(req, res));
router.post("/verify-otp", authenticate, otpLimiter, (req, res) => controller.verifyOtp(req, res));
router.post("/webhook",                  (req, res) => controller.webhook(req, res));

export default router;
