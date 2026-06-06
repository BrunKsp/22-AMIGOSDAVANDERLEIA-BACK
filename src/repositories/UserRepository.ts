import { MongoRepository } from "typeorm";
import { ObjectId } from "mongodb";
import { AppDataSource } from "../config/database";
import { User } from "../models/User";

export class UserRepository {
  private repo: MongoRepository<User>;

  constructor() {
    this.repo = AppDataSource.getMongoRepository(User);
  }

  async findAll(): Promise<User[]> {
    return this.repo.find();
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ _id: new ObjectId(id) as any });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email } as any);
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    await this.repo.updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}
