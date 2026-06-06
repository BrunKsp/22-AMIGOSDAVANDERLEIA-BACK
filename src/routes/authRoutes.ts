import { Router } from "express";
import { AuthController } from "../api/controllers/AuthController";
import { validateDto } from "../middlewares/validateDto";
import { authenticate } from "../middlewares/authenticate";
import { RegisterDto } from "../application/dtos/RegisterDto";
import { LoginDto } from "../application/dtos/LoginDto";

const router = Router();
const controller = new AuthController();

router.post("/register", validateDto(RegisterDto), (req, res) => controller.register(req, res));
router.post("/login", validateDto(LoginDto), (req, res) => controller.login(req, res));
router.get("/me", authenticate, (req, res) => controller.me(req, res));

export default router;
