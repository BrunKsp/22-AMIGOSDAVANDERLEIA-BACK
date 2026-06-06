import { Router } from "express";
import { WhatsAppController } from "../api/controllers/WhatsAppController";
import { authenticate } from "../middlewares/authenticate";

const router = Router();
const controller = new WhatsAppController();

router.post("/send-otp",   authenticate, (req, res) => controller.sendOtp(req, res));
router.post("/verify-otp", authenticate, (req, res) => controller.verifyOtp(req, res));
router.post("/webhook",                  (req, res) => controller.webhook(req, res));

export default router;
