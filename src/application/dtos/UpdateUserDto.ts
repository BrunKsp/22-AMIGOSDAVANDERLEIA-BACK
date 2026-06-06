import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  Length,
  Matches,
} from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: "Nome deve ser uma string" })
  @Length(3, 100, { message: "Nome deve ter entre 3 e 100 caracteres" })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: "Email inválido" })
  email?: string;

  @IsOptional()
  @Matches(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, {
    message: "Telefone inválido. Formato esperado: (11) 91234-5678",
  })
  phone?: string;

  @IsOptional()
  @IsDateString({}, { message: "Data de nascimento inválida. Use o formato ISO: YYYY-MM-DD" })
  birthDate?: string;

  @IsOptional()
  @IsBoolean({ message: "active deve ser boolean" })
  active?: boolean;
}
