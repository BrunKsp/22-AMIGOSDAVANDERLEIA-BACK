import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsDateString,
  Length,
  Matches,
} from "class-validator";

export class CreateUserDto {
  @IsNotEmpty({ message: "Nome é obrigatório" })
  @IsString({ message: "Nome deve ser uma string" })
  @Length(3, 100, { message: "Nome deve ter entre 3 e 100 caracteres" })
  name!: string;

  @IsNotEmpty({ message: "Email é obrigatório" })
  @IsEmail({}, { message: "Email inválido" })
  email!: string;

  @IsNotEmpty({ message: "Telefone é obrigatório" })
  @IsString()
  phone!: string;

  @IsNotEmpty({ message: "CPF é obrigatório" })
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: "CPF inválido. Formato esperado: 000.000.000-00",
  })
  cpf!: string;

  @IsNotEmpty({ message: "Data de nascimento é obrigatória" })
  @IsDateString({}, { message: "Data de nascimento inválida. Use o formato ISO: YYYY-MM-DD" })
  birthDate!: string;
}
