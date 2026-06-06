import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Length,
} from "class-validator";
import { EstoqueCategoria, EstoqueUnidade } from "../../data/Infra.Documents/EstoqueItem";

export class CreateEstoqueItemDto {
  @IsNotEmpty({ message: "Nome é obrigatório" })
  @IsString()
  @Length(1, 100)
  nome!: string;

  @IsEnum(["sementes", "fertilizantes", "defensivos", "combustivel", "racao", "maquinario", "outros"], {
    message: "Categoria inválida",
  })
  categoria!: EstoqueCategoria;

  @IsNumber({}, { message: "Quantidade deve ser um número" })
  @Min(0, { message: "Quantidade não pode ser negativa" })
  quantidade!: number;

  @IsEnum(["kg", "L", "sc", "un", "t", "cx"], { message: "Unidade inválida" })
  unidade!: EstoqueUnidade;

  @IsNumber({}, { message: "Estoque mínimo deve ser um número" })
  @Min(0)
  estoqueMinimo!: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  descricao?: string;
}
