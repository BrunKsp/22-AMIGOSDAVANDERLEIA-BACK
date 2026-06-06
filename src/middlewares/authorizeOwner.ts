import { Request, Response, NextFunction } from "express";

/**
 * Garante que o usuário autenticado é o dono do recurso acessado.
 * Usado nas rotas aninhadas em /users/:slugUsuario/... e em /users/:slugUsuario.
 * Deve rodar depois do middleware authenticate (que popula req.user).
 */
export function authorizeOwner(req: Request, res: Response, next: NextFunction): void {
  const slug = req.params.slugUsuario;

  if (!req.user) {
    res.status(401).json({ message: "Não autenticado" });
    return;
  }
  if (!slug || req.user.slug !== slug) {
    res.status(403).json({ message: "Acesso negado a este recurso" });
    return;
  }
  next();
}
