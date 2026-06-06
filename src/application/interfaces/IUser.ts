export interface IUser {
  id: string;
  slug: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  cpf: string;
  birthDate: Date;
  active: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserRepository {
  findAll(): Promise<IUser[]>;
  findById(id: string): Promise<IUser | null>;
  findBySlug(slug: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByCpf(cpf: string): Promise<IUser | null>;
  findByPhone(phone: string): Promise<IUser | null>;
  create(data: ICreateUserData): Promise<IUser>;
  update(slug: string, data: IUpdateUserData): Promise<IUser | null>;
  delete(slug: string): Promise<boolean>;
}

export interface ICreateUserData {
  name: string;
  email: string;
  password: string;
  phone: string;
  cpf: string;
  birthDate: Date;
  slug: string;
}

export interface IUpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  birthDate?: Date;
  active?: boolean;
  phoneVerified?: boolean;
}
