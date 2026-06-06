import { Router } from "express";
import { UserController } from "../api/controllers/UserController";
import { validateDto } from "../middlewares/validateDto";
import { authenticate } from "../middlewares/authenticate";
import { UpdateUserDto } from "../application/dtos/UpdateUserDto";

const router = Router();
const controller = new UserController();

router.get("/", authenticate, (req, res) => controller.getAll(req, res));
router.get("/:slugUsuario", authenticate, (req, res) => controller.getBySlug(req, res));
router.put("/:slugUsuario", authenticate, validateDto(UpdateUserDto), (req, res) => controller.update(req, res));
router.delete("/:slugUsuario", authenticate, (req, res) => controller.delete(req, res));

export default router;
