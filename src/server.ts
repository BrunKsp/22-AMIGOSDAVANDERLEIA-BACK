import "reflect-metadata";
import "dotenv/config";
import app from "./app";
import { AppDataSource } from "./config/database";
import { connectMongo } from "./external/whatsapp/config/mongo";

const PORT = process.env.PORT ?? 3000;
const PG_RETRY_MS = 10_000;

// Inicializa o Postgres de forma resiliente: se cair, o servidor continua de pé
// (o fluxo do WhatsApp depende do Mongo) e tenta reconectar em background.
async function initPostgres(): Promise<void> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log("PostgreSQL conectado via TypeORM");

    if (await AppDataSource.showMigrations()) {
      console.log("Aplicando migrations pendentes...");
      await AppDataSource.runMigrations();
      console.log("Migrations aplicadas");
    }
  } catch (err: any) {
    console.error(`PostgreSQL indisponível (${err.message}). Nova tentativa em ${PG_RETRY_MS / 1000}s.`);
    setTimeout(() => { initPostgres(); }, PG_RETRY_MS);
  }
}

async function bootstrap(): Promise<void> {
  // Mongo é obrigatório para o WhatsApp/IA — se falhar, aí sim aborta.
  await connectMongo();

  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });

  // Postgres em paralelo, sem derrubar o serviço se estiver fora.
  initPostgres();
}

bootstrap().catch((err) => {
  console.error("Falha fatal na inicialização:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});
