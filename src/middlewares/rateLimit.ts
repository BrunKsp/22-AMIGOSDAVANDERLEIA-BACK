import { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

/**
 * Rate limiter simples em memória (por IP + rota). Suficiente para frear
 * brute force em login/OTP. Observação: o estado é por instância e zera no
 * restart — para múltiplas instâncias, trocar por um store compartilhado (Redis).
 */
export function rateLimit({ windowMs, max, message }: RateLimitOptions) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      res.status(429).json({ message: message ?? "Muitas tentativas. Tente novamente em instantes." });
      return;
    }

    recent.push(now);
    hits.set(key, recent);

    // limpeza preguiçosa para não crescer indefinidamente
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (v.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }

    next();
  };
}
