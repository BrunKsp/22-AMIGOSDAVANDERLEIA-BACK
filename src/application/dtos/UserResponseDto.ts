import { IUser } from "../interfaces/IUser";

export class UserResponseDto {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(user: IUser) {
    this.id = user.id;
    this.slug = user.slug;
    this.name = user.name;
    this.email = user.email;
    this.phone = user.phone;
    this.cpf = user.cpf;
    this.birthDate = user.birthDate;
    this.active = user.active;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  static fromEntity(user: IUser): UserResponseDto {
    return new UserResponseDto(user);
  }

  static fromList(users: IUser[]): UserResponseDto[] {
    return users.map((u) => new UserResponseDto(u));
  }
}
