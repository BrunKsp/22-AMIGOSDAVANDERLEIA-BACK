import { Request, Response } from "express";
import { AuthService } from "../../application/services/AuthService";
import { RegisterDto } from "../../application/dtos/RegisterDto";
import { LoginDto } from "../../application/dtos/LoginDto";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.register(req.body as RegisterDto);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(409).json({ message: err.message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const result = await authService.login(req.body as LoginDto);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ message: err.message });
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const user = await authService.me(req.user!);
      res.json({ data: user });
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  }
}
