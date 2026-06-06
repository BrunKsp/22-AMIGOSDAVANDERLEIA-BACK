import { Schema, model, Document } from "mongoose";

export type TransactionType = "despesa" | "receita";
export type TransactionOrigin = "whatsapp" | "web";
export type TransactionCategory =
  | "insumos"
  | "maquinario"
  | "mao_de_obra"
  | "combustivel"
  | "arrendamento"
  | "receitas"
  | "outros";

export interface ITransaction {
  userSlug: string;
  type: TransactionType;
  description: string;
  value: number;
  date: Date;
  category: TransactionCategory;
  origin: TransactionOrigin;
  rawMessage?: string;
}

export interface ITransactionDocument extends ITransaction, Document {}

const TransactionSchema = new Schema<ITransactionDocument>(
  {
    userSlug:    { type: String, required: true, index: true },
    type:        { type: String, enum: ["despesa", "receita"], required: true },
    description: { type: String, required: true },
    value:       { type: Number, required: true },
    date:        { type: Date, required: true },
    category:    {
      type: String,
      enum: ["insumos", "maquinario", "mao_de_obra", "combustivel", "arrendamento", "receitas", "outros"],
      default: "outros",
    },
    origin:      { type: String, enum: ["whatsapp", "web"], required: true },
    rawMessage:  { type: String },
  },
  { timestamps: true }
);

TransactionSchema.index({ userSlug: 1, date: -1 });

export const Transaction = model<ITransactionDocument>("Transaction", TransactionSchema);
