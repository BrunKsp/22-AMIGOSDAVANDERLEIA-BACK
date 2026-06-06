import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsDateString,
  Length,
  Matches,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsNotEmpty({ message: "Nome é obrigatório" })
  @IsString()
  @Length(3, 100, { message: "Nome deve ter entre 3 e 100 caracteres" })
  name!: string;

  @IsNotEmpty({ message: "Email é obrigatório" })
  @IsEmail({}, { message: "Email inválido" })
  email!: string;

  @IsNotEmpty({ message: "Senha é obrigatória" })
  @MinLength(6, { message: "Senha deve ter no mínimo 6 caracteres" })
  password!: string;

  @IsNotEmpty({ message: "Telefone é obrigatório" })
  @IsString()
  phone!: string;

  @IsNotEmpty({ message: "CPF é obrigatório" })
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: "CPF inválido. Formato esperado: 000.000.000-00",
  })
  cpf!: string;

  @IsNotEmpty({ message: "Data de nascimento é obrigatória" })
  @IsDateString({}, { message: "Data inválida. Use o formato ISO: YYYY-MM-DD" })
  birthDate!: string;
}
