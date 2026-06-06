import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRepository } from "../../infra/repositories/UserRepository";
import { OtpService } from "./OtpService";
import { RegisterDto } from "../dtos/RegisterDto";
import { LoginDto } from "../dtos/LoginDto";
import { IAuthResponse, ITokenPayload } from "../interfaces/IAuth";
import { UserResponseDto } from "../dtos/UserResponseDto";
import { generateSlug } from "../../shared/utils/generateSlug";
import { normalizePhone } from "../../shared/utils/normalizePhone";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../../config/secrets";

export class AuthService {
  private userRepository: UserRepository;
  private otpService: OtpService;

  constructor() {
    this.userRepository = new UserRepository();
    this.otpService = new OtpService();
  }

  async register(dto: RegisterDto): Promise<IAuthResponse> {
    const emailExists = await this.userRepository.findByEmail(dto.email);
    if (emailExists) throw new Error("Email já está em uso");

    const cpfExists = await this.userRepository.findByCpf(dto.cpf);
    if (cpfExists) throw new Error("CPF já cadastrado");

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      phone: normalizePhone(dto.phone),
      cpf: dto.cpf,
      birthDate: new Date(dto.birthDate),
      slug: generateSlug(),
    });

    this.otpService.sendOtp(user.phone, user.slug).catch((err) => {
      const detail = err?.response?.data ?? err.message;
      console.error("[register] Falha ao enviar OTP:", JSON.stringify(detail));
    });

    return this.buildAuthResponse(user.id, user.slug, user.email, user.name);
  }

  async login(dto: LoginDto): Promise<IAuthResponse> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) throw new Error("Credenciais inválidas");

    if (!user.active) throw new Error("Conta desativada");

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new Error("Credenciais inválidas");

    return this.buildAuthResponse(user.id, user.slug, user.email, user.name);
  }

  async me(payload: ITokenPayload): Promise<UserResponseDto> {
    const user = await this.userRepository.findBySlug(payload.slug);
    if (!user) throw new Error("Usuário não encontrado");
    return UserResponseDto.fromEntity(user);
  }

  private buildAuthResponse(
    id: string,
    slug: string,
    email: string,
    name: string
  ): IAuthResponse {
    const payload: ITokenPayload = { sub: id, slug, email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);

    return {
      token,
      type: "Bearer",
      expiresIn: JWT_EXPIRES_IN,
      user: { slug, name, email },
    };
  }
}
