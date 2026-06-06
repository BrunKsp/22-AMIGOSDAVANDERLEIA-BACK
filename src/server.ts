import "reflect-metadata";
import "dotenv/config";
import app from "./app";
import { AppDataSource } from "./config/database";

const PORT = process.env.PORT ?? 3000;

AppDataSource.initialize()
  .then(() => {
    console.log("MongoDB connected via TypeORM");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
    process.exit(1);
  });
