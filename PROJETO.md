# Amigos da Vanderleia — Backend

## Ideia do projeto

**Amigos da Vanderleia** é uma plataforma de gestão de comunidade que permite cadastrar, autenticar e gerenciar membros de um grupo. O objetivo é ter um sistema seguro, com autenticação JWT, onde cada usuário possui um identificador público único (slug) que pode ser usado nas URLs de forma legível e sem expor o UUID interno.

## Tecnologias

| Tecnologia | Uso |
|---|---|
| **Node.js + TypeScript** | Runtime e tipagem estática |
| **Express 5** | Framework HTTP |
| **TypeORM** | ORM com migrations versionadas |
| **PostgreSQL (Neon)** | Banco de dados relacional em nuvem |
| **JWT (jsonwebtoken)** | Autenticação stateless via Bearer Token |
| **bcrypt** | Hash seguro de senhas |
| **class-validator** | Validação de DTOs nas requisições |

## Arquitetura

O projeto segue o padrão **MVC com camadas bem definidas**:

```
src/
├── api/
│   ├── controllers/        ← Recebem request e devolvem response
│   └── routes/
├── application/
│   ├── dtos/               ← Contratos de entrada e saída com validação
│   ├── interfaces/         ← Contratos TypeScript (IUser, IAuth)
│   └── services/           ← Regras de negócio
├── data/
│   ├── migrations/         ← Histórico versionado do schema do banco
│   └── models/             ← Entidades TypeORM (mapeamento de tabelas)
├── infra/
│   └── repositories/       ← Acesso ao banco via TypeORM
├── middlewares/
│   ├── authenticate.ts     ← Valida Bearer Token JWT
│   └── validateDto.ts      ← Valida body da request contra DTO
├── shared/
│   └── utils/
│       └── generateSlug.ts ← Gerador de slug base64 (algoritmo C#)
├── config/
│   ├── database.ts         ← DataSource para o servidor
│   └── dataSourceCli.ts    ← DataSource para o CLI de migrations
├── routes/
│   ├── authRoutes.ts       ← /auth/*
│   └── userRoutes.ts       ← /users/*
├── app.ts                  ← Configuração Express
└── server.ts               ← Entry point
```

## Identificadores do usuário

Cada usuário possui dois identificadores:

- **`id`** — UUID v4 gerado pelo PostgreSQL (`uuid_generate_v4()`). Usado internamente, nunca exposto em rotas.
- **`slug`** — Hash base64 compacto gerado a partir de um UUID, replicando o algoritmo C#:
  ```
  Convert.ToBase64String(Guid.NewGuid().ToByteArray())
    .Replace("/", "-")
    .Replace("+", "_")
  ```
  Exemplo: `BYWsMEgIRzSGFAuUOE_dpg==`. Usado em todas as rotas públicas.

## Fluxo de autenticação

```
POST /auth/register  →  cria conta  →  retorna token JWT
POST /auth/login     →  valida senha →  retorna token JWT
GET  /auth/me        →  token JWT   →  retorna dados do usuário logado

Rotas protegidas usam: Authorization: Bearer <token>
```

## Variáveis de ambiente

```env
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=sua_chave_secreta
JWT_EXPIRES_IN=7d
```
