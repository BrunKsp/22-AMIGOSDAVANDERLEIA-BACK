import mongoose from "mongoose";

let connected = false;

export async function connectMongo(): Promise<void> {
  if (connected) return;

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI não definida no .env");

  await mongoose.connect(uri);
  connected = true;
  console.log("MongoDB conectado (Mongoose)");
}

export { mongoose };
