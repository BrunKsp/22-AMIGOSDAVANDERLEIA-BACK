import { Router } from "express";
import { UserController } from "../api/controllers/UserController";
import { validateDto } from "../middlewares/validateDto";
import { CreateUserDto } from "../application/dtos/CreateUserDto";
import { UpdateUserDto } from "../application/dtos/UpdateUserDto";

const router = Router();
const controller = new UserController();

router.get("/", (req, res) => controller.getAll(req, res));
router.get("/slug/:slug", (req, res) => controller.getBySlug(req, res));
router.get("/:id", (req, res) => controller.getById(req, res));
router.post("/", validateDto(CreateUserDto), (req, res) => controller.create(req, res));
router.put("/:id", validateDto(UpdateUserDto), (req, res) => controller.update(req, res));
router.delete("/:id", (req, res) => controller.delete(req, res));

export default router;
