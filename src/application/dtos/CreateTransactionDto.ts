import { IsString, IsNumber, IsIn, IsDateString, IsOptional, Min, IsNotEmpty } from "class-validator";
import { TransactionType, TransactionCategory, TransactionOrigin } from "../../data/Infra.Documents/Transaction";

export class CreateTransactionDto {
  @IsIn(["despesa", "receita"])
  type!: TransactionType;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(0.01)
  value!: number;

  @IsDateString()
  date!: string;

  @IsIn(["insumos", "maquinario", "mao_de_obra", "combustivel", "arrendamento", "receitas", "outros"])
  @IsOptional()
  category?: TransactionCategory;

  @IsIn(["whatsapp", "web"])
  @IsOptional()
  origin?: TransactionOrigin;
}
