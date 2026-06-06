import { Request, Response } from "express";
import { UserService } from "../../application/services/UserService";
import { UpdateUserDto } from "../../application/dtos/UpdateUserDto";

const userService = new UserService();

export class UserController {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const users = await userService.getAll();
      res.json({ data: users, total: users.length });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.getBySlug(req.params["slugUsuario"] as string);
      res.json({ data: user });
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.update(
        req.params["slugUsuario"] as string,
        req.body as UpdateUserDto
      );
      res.json({ message: "Usuário atualizado com sucesso", data: user });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await userService.delete(req.params["slugUsuario"] as string);
      res.status(204).send();
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  }
}
