import { MigrationInterface, QueryRunner } from "typeorm";

export class CriarUsuarios1780705881609 implements MigrationInterface {
  name = "CriarUsuarios1780705881609";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug"       character varying(24) NOT NULL,
        "name"       character varying(100) NOT NULL,
        "email"      character varying(150) NOT NULL,
        "phone"      character varying(20) NOT NULL,
        "cpf"        character varying(14) NOT NULL,
        "birth_date" date NOT NULL,
        "active"     boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_cpf"   UNIQUE ("cpf"),
        CONSTRAINT "UQ_users_slug"  UNIQUE ("slug"),
        CONSTRAINT "PK_users"       PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
