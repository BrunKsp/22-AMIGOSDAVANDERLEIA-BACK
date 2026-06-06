import { Schema, model, Document, Types } from "mongoose";

export type MovimentacaoTipo = "entrada" | "saida";

export interface IEstoqueMovimentacao {
  itemId: Types.ObjectId;
  userSlug: string;
  tipo: MovimentacaoTipo;
  quantidade: number;
  motivo?: string;
  origem: "web" | "whatsapp";
  data: Date;
}

export interface IEstoqueMovimentacaoDocument extends IEstoqueMovimentacao, Document {}

const EstoqueMovimentacaoSchema = new Schema<IEstoqueMovimentacaoDocument>(
  {
    itemId:     { type: Schema.Types.ObjectId, ref: "EstoqueItem", required: true, index: true },
    userSlug:   { type: String, required: true, index: true },
    tipo:       { type: String, enum: ["entrada", "saida"], required: true },
    quantidade: { type: Number, required: true },
    motivo:     { type: String },
    origem:     { type: String, enum: ["web", "whatsapp"], default: "web" },
    data:       { type: Date, default: Date.now },
  },
  { timestamps: true }
);

EstoqueMovimentacaoSchema.index({ userSlug: 1, data: -1 });

export const EstoqueMovimentacao = model<IEstoqueMovimentacaoDocument>(
  "EstoqueMovimentacao",
  EstoqueMovimentacaoSchema
);
