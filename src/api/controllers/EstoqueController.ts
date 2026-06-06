import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { EstoqueService } from "../../application/services/EstoqueService";
import { CreateEstoqueItemDto } from "../../application/dtos/CreateEstoqueItemDto";
import { MovimentarEstoqueDto } from "../../application/dtos/MovimentarEstoqueDto";

const service = new EstoqueService();

export class EstoqueController {

  async listar(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params["slugUsuario"] as string;
      const { categoria } = req.query as { categoria?: string };
      const data = await service.listar(slugUsuario, categoria);
      res.json({ data, total: data.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async buscar(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params["slugUsuario"] as string;
      const id          = req.params["id"] as string;
      const data = await service.buscarPorId(slugUsuario, id);
      res.json({ data });
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params["slugUsuario"] as string;
      const dto = plainToInstance(CreateEstoqueItemDto, req.body);
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      if (errors.length > 0) {
        res.status(422).json({ message: "Erro de validação", errors });
        return;
      }
      const data = await service.criar(slugUsuario, dto);
      res.status(201).json({ data });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params["slugUsuario"] as string;
      const id          = req.params["id"] as string;
      const data = await service.atualizar(slugUsuario, id, req.body);
      res.json({ data });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async deletar(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params["slugUsuario"] as string;
      const id          = req.params["id"] as string;
      await service.deletar(slugUsuario, id);
      res.sendStatus(204);
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  }

  async movimentar(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params["slugUsuario"] as string;
      const id          = req.params["id"] as string;
      const dto = plainToInstance(MovimentarEstoqueDto, req.body);
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      if (errors.length > 0) {
        res.status(422).json({ message: "Erro de validação", errors });
        return;
      }
      const data = await service.movimentar(slugUsuario, id, dto);
      res.json({ data });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async alertas(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params["slugUsuario"] as string;
      const data = await service.alertas(slugUsuario);
      res.json({ data, total: data.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async movimentacoes(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params["slugUsuario"] as string;
      const { itemId, limite } = req.query as { itemId?: string; limite?: string };
      const data = await service.movimentacoes(slugUsuario, itemId, limite ? Number(limite) : 50);
      res.json({ data, total: data.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async resumo(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params["slugUsuario"] as string;
      const data = await service.resumo(slugUsuario);
      res.json({ data });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
}
