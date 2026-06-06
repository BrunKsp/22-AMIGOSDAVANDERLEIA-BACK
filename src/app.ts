import "reflect-metadata";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import whatsappRoutes from "./routes/whatsappRoutes";
import financeiroRoutes from "./routes/financeiroRoutes";
import estoqueRoutes from "./routes/estoqueRoutes";

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-webhook-secret"],
}));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/users/:slugUsuario/financeiro", financeiroRoutes);
app.use("/users/:slugUsuario/estoque",    estoqueRoutes);
app.use("/whatsapp", whatsappRoutes);

// 404 para rotas não encontradas
app.use((_req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});

// Tratador de erros global — evita derrubar o processo e padroniza a resposta
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[error]", err?.message ?? err);
  if (res.headersSent) return;
  res.status(err?.status ?? 500).json({ message: "Erro interno no servidor" });
});

export default app;
