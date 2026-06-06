import { Schema, model, Document } from "mongoose";

export type EstoqueCategoria =
  | "sementes"
  | "fertilizantes"
  | "defensivos"
  | "combustivel"
  | "racao"
  | "maquinario"
  | "outros";

export type EstoqueUnidade = "kg" | "L" | "sc" | "un" | "t" | "cx";

export interface IEstoqueItem {
  userSlug: string;
  nome: string;
  categoria: EstoqueCategoria;
  quantidade: number;
  unidade: EstoqueUnidade;
  estoqueMinimo: number;
  descricao?: string;
}

export interface IEstoqueItemDocument extends IEstoqueItem, Document {}

const EstoqueItemSchema = new Schema<IEstoqueItemDocument>(
  {
    userSlug:      { type: String, required: true, index: true },
    nome:          { type: String, required: true },
    categoria:     {
      type: String,
      enum: ["sementes", "fertilizantes", "defensivos", "combustivel", "racao", "maquinario", "outros"],
      required: true,
    },
    quantidade:    { type: Number, required: true, default: 0 },
    unidade:       { type: String, enum: ["kg", "L", "sc", "un", "t", "cx"], required: true },
    estoqueMinimo: { type: Number, required: true, default: 0 },
    descricao:     { type: String },
  },
  { timestamps: true }
);

EstoqueItemSchema.index({ userSlug: 1, categoria: 1 });

export const EstoqueItem = model<IEstoqueItemDocument>("EstoqueItem", EstoqueItemSchema);
