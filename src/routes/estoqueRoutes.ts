import { Router } from "express";
import { EstoqueController } from "../api/controllers/EstoqueController";
import { authenticate } from "../middlewares/authenticate";
import { authorizeOwner } from "../middlewares/authorizeOwner";

const router = Router({ mergeParams: true });
const controller = new EstoqueController();

router.use(authenticate, authorizeOwner);

router.get(  "/",                     (req, res) => controller.listar(req, res));
router.post( "/",                     (req, res) => controller.criar(req, res));
router.get(  "/alertas",              (req, res) => controller.alertas(req, res));
router.get(  "/resumo",               (req, res) => controller.resumo(req, res));
router.get(  "/movimentacoes",        (req, res) => controller.movimentacoes(req, res));
router.get(  "/:id",                  (req, res) => controller.buscar(req, res));
router.put(  "/:id",                  (req, res) => controller.atualizar(req, res));
router.delete("/:id",                 (req, res) => controller.deletar(req, res));
router.post( "/:id/movimentar",       (req, res) => controller.movimentar(req, res));

export default router;
