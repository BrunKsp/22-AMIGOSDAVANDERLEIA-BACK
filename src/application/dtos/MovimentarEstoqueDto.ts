import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { MovimentacaoTipo } from "../../data/Infra.Documents/EstoqueMovimentacao";

export class MovimentarEstoqueDto {
  @IsEnum(["entrada", "saida"], { message: "Tipo deve ser 'entrada' ou 'saida'" })
  tipo!: MovimentacaoTipo;

  @IsNumber({}, { message: "Quantidade deve ser um número" })
  @Min(0.01, { message: "Quantidade deve ser maior que zero" })
  quantidade!: number;

  @IsOptional()
  @IsString()
  motivo?: string;
}
