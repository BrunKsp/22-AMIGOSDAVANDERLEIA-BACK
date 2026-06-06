import "reflect-metadata";
import path from "path";
import { DataSource } from "typeorm";
import { User } from "../data/Infra.PG/User";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  synchronize: false,
  logging: false,
  entities: [User],
  migrations: [path.join(__dirname, "../data/migrations/*.js")],
  migrationsTableName: "typeorm_migrations",
});
