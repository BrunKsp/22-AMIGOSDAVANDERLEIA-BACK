import { UserRepository } from "../../infra/repositories/UserRepository";
import { UpdateUserDto } from "../dtos/UpdateUserDto";
import { UserResponseDto } from "../dtos/UserResponseDto";
import { normalizePhone } from "../../shared/utils/normalizePhone";

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return UserResponseDto.fromList(users);
  }

  async getBySlug(slug: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findBySlug(slug);
    if (!user) throw new Error("Usuário não encontrado");
    return UserResponseDto.fromEntity(user);
  }

  async update(slug: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const exists = await this.userRepository.findBySlug(slug);
    if (!exists) throw new Error("Usuário não encontrado");

    if (dto.email && dto.email !== exists.email) {
      const emailExists = await this.userRepository.findByEmail(dto.email);
      if (emailExists) throw new Error("Email já está em uso");
    }

    const updated = await this.userRepository.update(slug, {
      ...dto,
      phone: dto.phone ? normalizePhone(dto.phone) : undefined,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    });

    return UserResponseDto.fromEntity(updated!);
  }

  async delete(slug: string): Promise<void> {
    const deleted = await this.userRepository.delete(slug);
    if (!deleted) throw new Error("Usuário não encontrado");
  }
}
