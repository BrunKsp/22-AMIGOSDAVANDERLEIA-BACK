import "reflect-metadata";
import "dotenv/config";
import app from "./app";
import { AppDataSource } from "./config/database";
import { connectMongo } from "./external/whatsapp/config/mongo";

const PORT = process.env.PORT ?? 3000;

Promise.all([
  AppDataSource.initialize(),
  connectMongo(),
])
  .then(async () => {
    console.log("PostgreSQL conectado via TypeORM");

    const pending = await AppDataSource.showMigrations();
    if (pending) {
      console.log("Aplicando migrations pendentes...");
      await AppDataSource.runMigrations();
      console.log("Migrations aplicadas");
    }

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Falha na inicialização:", err);
    process.exit(1);
  });
