import "reflect-metadata";
import "dotenv/config";
import path from "path";
import { DataSource } from "typeorm";
import { User } from "../data/Infra.PG/User";

const DataSourceCli = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  synchronize: false,
  logging: true,
  entities: [User],
  migrations: [path.join(__dirname, "../data/migrations/*.{ts,js}")],
  migrationsTableName: "typeorm_migrations",
});

export default DataSourceCli;
