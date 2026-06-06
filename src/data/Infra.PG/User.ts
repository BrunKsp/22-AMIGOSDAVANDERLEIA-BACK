import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { IUser } from "../../application/interfaces/IUser";

@Entity("users")
export class User implements IUser {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, length: 24 })
  slug!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ unique: true, length: 150 })
  email!: string;

  @Column({ name: "password", length: 255 })
  password!: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ unique: true, length: 14 })
  cpf!: string;

  @Column({ type: "date", name: "birth_date" })
  birthDate!: Date;

  @Column({ default: true })
  active!: boolean;

  @Column({ name: "phone_verified", default: false })
  phoneVerified!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
