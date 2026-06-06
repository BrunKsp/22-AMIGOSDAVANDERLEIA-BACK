import { Router } from "express";
import { UserController } from "../api/controllers/UserController";
import { validateDto } from "../middlewares/validateDto";
import { authenticate } from "../middlewares/authenticate";
import { authorizeOwner } from "../middlewares/authorizeOwner";
import { UpdateUserDto } from "../application/dtos/UpdateUserDto";

const router = Router();
const controller = new UserController();

router.get("/", authenticate, (req, res) => controller.getMe(req, res));
router.get("/:slugUsuario", authenticate, authorizeOwner, (req, res) => controller.getBySlug(req, res));
router.put("/:slugUsuario", authenticate, authorizeOwner, validateDto(UpdateUserDto), (req, res) => controller.update(req, res));
router.delete("/:slugUsuario", authenticate, authorizeOwner, (req, res) => controller.delete(req, res));

export default router;
