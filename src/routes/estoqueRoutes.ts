import { Router } from "express";
import { EstoqueController } from "../api/controllers/EstoqueController";
import { authenticate } from "../middlewares/authenticate";

const router = Router({ mergeParams: true });
const controller = new EstoqueController();

router.get(  "/",                     authenticate, (req, res) => controller.listar(req, res));
router.post( "/",                     authenticate, (req, res) => controller.criar(req, res));
router.get(  "/alertas",              authenticate, (req, res) => controller.alertas(req, res));
router.get(  "/resumo",               authenticate, (req, res) => controller.resumo(req, res));
router.get(  "/movimentacoes",        authenticate, (req, res) => controller.movimentacoes(req, res));
router.get(  "/:id",                  authenticate, (req, res) => controller.buscar(req, res));
router.put(  "/:id",                  authenticate, (req, res) => controller.atualizar(req, res));
router.delete("/:id",                 authenticate, (req, res) => controller.deletar(req, res));
router.post( "/:id/movimentar",       authenticate, (req, res) => controller.movimentar(req, res));

export default router;
