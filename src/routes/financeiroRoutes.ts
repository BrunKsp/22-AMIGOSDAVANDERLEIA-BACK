import { Router } from "express";
import { FinanceiroController } from "../api/controllers/FinanceiroController";
import { authenticate } from "../middlewares/authenticate";
import { authorizeOwner } from "../middlewares/authorizeOwner";

const router = Router({ mergeParams: true });
const controller = new FinanceiroController();

router.use(authenticate, authorizeOwner);

router.get( "/dashboard",          (req, res) => controller.dashboard(req, res));
router.get( "/lancamentos",        (req, res) => controller.listar(req, res));
router.post("/lancamentos",        (req, res) => controller.criar(req, res));
router.delete("/lancamentos/:id",  (req, res) => controller.deletar(req, res));

export default router;
