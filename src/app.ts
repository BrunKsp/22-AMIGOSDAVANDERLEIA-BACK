import "reflect-metadata";
import express from "express";
import userRoutes from "./routes/userRoutes";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/users", userRoutes);

export default app;
