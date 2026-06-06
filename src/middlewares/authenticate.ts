import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ITokenPayload } from "../application/interfaces/IAuth";

declare global {
  namespace Express {
    interface Request {
      user?: ITokenPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme_secret";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token não fornecido" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as ITokenPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Token inválido ou expirado" });
  }
}
