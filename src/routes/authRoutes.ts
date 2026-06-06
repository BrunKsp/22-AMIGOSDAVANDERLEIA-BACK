import { Router } from "express";
import { AuthController } from "../api/controllers/AuthController";
import { validateDto } from "../middlewares/validateDto";
import { authenticate } from "../middlewares/authenticate";
import { rateLimit } from "../middlewares/rateLimit";
import { RegisterDto } from "../application/dtos/RegisterDto";
import { LoginDto } from "../application/dtos/LoginDto";

const router = Router();
const controller = new AuthController();

const loginLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 10, message: "Muitas tentativas de login. Aguarde alguns minutos." });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10 });

router.post("/register", registerLimiter, validateDto(RegisterDto), (req, res) => controller.register(req, res));
router.post("/login", loginLimiter, validateDto(LoginDto), (req, res) => controller.login(req, res));
router.get("/me", authenticate, (req, res) => controller.me(req, res));

export default router;
