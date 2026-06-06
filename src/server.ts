import "reflect-metadata";
import "dotenv/config";
import app from "./app";
import { AppDataSource } from "./config/database";

const PORT = process.env.PORT ?? 3000;

AppDataSource.initialize()
  .then(async () => {
    console.log("PostgreSQL conectado via TypeORM");

    const pending = await AppDataSource.showMigrations();
    if (pending) {
      console.log("Aplicando migrations pendentes...");
      await AppDataSource.runMigrations();
      console.log("Migrations aplicadas com sucesso");
    }

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Falha na conexão com o banco:", err);
    process.exit(1);
  });
