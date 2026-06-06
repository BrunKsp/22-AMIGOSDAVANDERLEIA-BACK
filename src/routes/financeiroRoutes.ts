import { Router } from "express";
import { FinanceiroController } from "../api/controllers/FinanceiroController";
import { authenticate } from "../middlewares/authenticate";

const router = Router({ mergeParams: true });
const controller = new FinanceiroController();

router.get( "/dashboard",          authenticate, (req, res) => controller.dashboard(req, res));
router.get( "/lancamentos",        authenticate, (req, res) => controller.listar(req, res));
router.post("/lancamentos",        authenticate, (req, res) => controller.criar(req, res));
router.delete("/lancamentos/:id",  authenticate, (req, res) => controller.deletar(req, res));

export default router;
