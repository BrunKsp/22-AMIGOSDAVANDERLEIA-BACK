import { UserRepository } from "../repositories/UserRepository";
import { User } from "../models/User";

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async getById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  async create(data: { name: string; email: string }): Promise<User> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) throw new Error("Email already in use");
    return this.userRepository.create(data);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.userRepository.update(id, data);
    if (!user) throw new Error("User not found");
    return user;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.userRepository.delete(id);
    if (!deleted) throw new Error("User not found");
  }
}
