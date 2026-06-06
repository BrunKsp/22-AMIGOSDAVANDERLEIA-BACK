import { Repository, In } from "typeorm";
import { AppDataSource } from "../../config/database";
import { User } from "../../data/Infra.PG/User";
import { IUserRepository, ICreateUserData, IUpdateUserData, IUser } from "../../application/interfaces/IUser";

export class UserRepository implements IUserRepository {
  private repo: Repository<User>;

  constructor() {
    this.repo = AppDataSource.getRepository(User);
  }

  async findAll(): Promise<IUser[]> {
    return this.repo.find({ order: { createdAt: "DESC" } });
  }

  async findById(id: string): Promise<IUser | null> {
    return this.repo.findOneBy({ id });
  }

  async findBySlug(slug: string): Promise<IUser | null> {
    return this.repo.findOneBy({ slug });
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.repo.findOneBy({ email });
  }

  async findByCpf(cpf: string): Promise<IUser | null> {
    return this.repo.findOneBy({ cpf });
  }

  async findByPhone(phone: string): Promise<IUser | null> {
    const digits = phone.replace(/\D/g, "");
    // Tenta as variações: +5551..., 5551..., e com/sem 9º dígito
    const candidates = [
      phone,
      `+${digits}`,
      digits,
    ];
    // Adiciona variante sem o 9º dígito (área 2 dígitos + 8 dígitos)
    if (digits.length === 13) {
      // ex: 5551999978307 → 551978307 (remove o 9 depois do DDD)
      const sem9 = digits.slice(0, 4) + digits.slice(5);
      candidates.push(`+${sem9}`, sem9);
    }
    return this.repo.findOneBy({ phone: In([...new Set(candidates)]) });
  }

  async create(data: ICreateUserData): Promise<IUser> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async update(slug: string, data: IUpdateUserData): Promise<IUser | null> {
    await this.repo.update({ slug }, data as Partial<User>);
    return this.findBySlug(slug);
  }

  async delete(slug: string): Promise<boolean> {
    const result = await this.repo.delete({ slug });
    return (result.affected ?? 0) > 0;
  }
}
