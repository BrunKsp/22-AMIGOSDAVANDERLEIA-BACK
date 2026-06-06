import { IsEmail, IsNotEmpty, MinLength } from "class-validator";

export class LoginDto {
  @IsNotEmpty({ message: "Email é obrigatório" })
  @IsEmail({}, { message: "Email inválido" })
  email!: string;

  @IsNotEmpty({ message: "Senha é obrigatória" })
  @MinLength(6, { message: "Senha deve ter no mínimo 6 caracteres" })
  password!: string;
}
