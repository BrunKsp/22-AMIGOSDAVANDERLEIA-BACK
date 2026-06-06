import { UserRepository } from "../../infra/repositories/UserRepository";
import { CreateUserDto } from "../dtos/CreateUserDto";
import { UpdateUserDto } from "../dtos/UpdateUserDto";
import { UserResponseDto } from "../dtos/UserResponseDto";
import { generateSlug } from "../../shared/utils/generateSlug";

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return UserResponseDto.fromList(users);
  }

  async getById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new Error("Usuário não encontrado");
    return UserResponseDto.fromEntity(user);
  }

  async getBySlug(slug: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findBySlug(slug);
    if (!user) throw new Error("Usuário não encontrado");
    return UserResponseDto.fromEntity(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const emailExists = await this.userRepository.findByEmail(dto.email);
    if (emailExists) throw new Error("Email já está em uso");

    const cpfExists = await this.userRepository.findByCpf(dto.cpf);
    if (cpfExists) throw new Error("CPF já cadastrado");

    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      cpf: dto.cpf,
      birthDate: new Date(dto.birthDate),
      slug: generateSlug(),
    });

    return UserResponseDto.fromEntity(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const exists = await this.userRepository.findById(id);
    if (!exists) throw new Error("Usuário não encontrado");

    if (dto.email && dto.email !== exists.email) {
      const emailExists = await this.userRepository.findByEmail(dto.email);
      if (emailExists) throw new Error("Email já está em uso");
    }

    const updated = await this.userRepository.update(id, {
      ...dto,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    });

    return UserResponseDto.fromEntity(updated!);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) throw new Error("Usuário não encontrado");
  }
}
