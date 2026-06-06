import "reflect-metadata";
import express from "express";
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
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/users/:slugUsuario/financeiro", financeiroRoutes);
app.use("/users/:slugUsuario/estoque",    estoqueRoutes);
app.use("/whatsapp", whatsappRoutes);

export default app;
