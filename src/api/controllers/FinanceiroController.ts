import { Request, Response } from "express";
import { FinanceiroService } from "../../application/services/FinanceiroService";
import { CreateTransactionDto } from "../../application/dtos/CreateTransactionDto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

const service = new FinanceiroService();

export class FinanceiroController {

  async dashboard(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params.slugUsuario as string;
      const { mes } = req.query as { mes?: string };
      const data = await service.dashboard(slugUsuario, mes);
      res.json({ data });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async listar(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params.slugUsuario as string;
      const { tipo, categoria, busca, mes } = req.query as Record<string, string>;
      const data = await service.listar(slugUsuario, { tipo, categoria, busca, mes });
      res.json({ data, total: (data as unknown[]).length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async criar(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params.slugUsuario as string;
      const dto = plainToInstance(CreateTransactionDto, req.body);
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

  async deletar(req: Request, res: Response): Promise<void> {
    try {
      const slugUsuario = req.params.slugUsuario as string;
      const id = req.params.id as string;
      const ok = await service.deletar(slugUsuario, id);
      if (!ok) { res.status(404).json({ message: "Lançamento não encontrado" }); return; }
      res.sendStatus(204);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }
}
