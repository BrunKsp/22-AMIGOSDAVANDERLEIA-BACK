import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Length,
} from "class-validator";
import { EstoqueCategoria, EstoqueUnidade } from "../../data/Infra.Documents/EstoqueItem";

export class UpdateEstoqueItemDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  nome?: string;

  @IsOptional()
  @IsEnum(["sementes", "fertilizantes", "defensivos", "combustivel", "racao", "maquinario", "outros"], {
    message: "Categoria inválida",
  })
  categoria?: EstoqueCategoria;

  @IsOptional()
  @IsNumber({}, { message: "Quantidade deve ser um número" })
  @Min(0, { message: "Quantidade não pode ser negativa" })
  quantidade?: number;

  @IsOptional()
  @IsEnum(["kg", "L", "sc", "un", "t", "cx"], { message: "Unidade inválida" })
  unidade?: EstoqueUnidade;

  @IsOptional()
  @IsNumber({}, { message: "Estoque mínimo deve ser um número" })
  @Min(0)
  estoqueMinimo?: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  descricao?: string;
}
