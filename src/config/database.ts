import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../models/User";

export const AppDataSource = new DataSource({
  type: "mongodb",
  url: process.env.MONGO_URI ?? "mongodb://localhost:27017/amigosdavanderleia",
  useNewUrlParser: true,
  useUnifiedTopology: true,
  synchronize: true,
  logging: false,
  entities: [User],
});
