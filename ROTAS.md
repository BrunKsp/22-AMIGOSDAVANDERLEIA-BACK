# Documentação de Rotas

Base URL: `http://localhost:3000`

Rotas protegidas exigem o header:
```
Authorization: Bearer <token>
```

---

## Auth — `/auth`

### `POST /auth/register`
Cria uma nova conta e retorna o token de acesso.

**Body:**
```json
{
  "name": "Vanderleia Santos",
  "email": "vanderleia@email.com",
  "password": "senha123",
  "phone": "(11) 91234-5678",
  "cpf": "111.222.333-44",
  "birthDate": "1990-05-15"
}
```

**Validações:**
| Campo | Regra |
|---|---|
| `name` | obrigatório, 3–100 caracteres |
| `email` | formato de email válido |
| `password` | mínimo 6 caracteres |
| `phone` | formato `(DD) 9XXXX-XXXX` |
| `cpf` | formato `000.000.000-00` |
| `birthDate` | ISO date `YYYY-MM-DD` |

**Resposta `201`:**
```json
{
  "token": "eyJhbGci...",
  "type": "Bearer",
  "expiresIn": "7d",
  "user": {
    "slug": "BYWsMEgIRzSGFAuUOE_dpg==",
    "name": "Vanderleia Santos",
    "email": "vanderleia@email.com"
  }
}
```

**Erros:**
- `422` — campos inválidos (`{ "message": "Erro de validação", "errors": { "campo": ["mensagem"] } }`)
- `409` — email ou CPF já cadastrado

---

### `POST /auth/login`
Autentica um usuário existente e retorna o token.

**Body:**
```json
{
  "email": "vanderleia@email.com",
  "password": "senha123"
}
```

**Resposta `200`:**
```json
{
  "token": "eyJhbGci...",
  "type": "Bearer",
  "expiresIn": "7d",
  "user": {
    "slug": "BYWsMEgIRzSGFAuUOE_dpg==",
    "name": "Vanderleia Santos",
    "email": "vanderleia@email.com"
  }
}
```

**Erros:**
- `422` — campos inválidos
- `401` — credenciais inválidas ou conta desativada

---

### `GET /auth/me` 🔒
Retorna os dados do usuário autenticado pelo token.

**Headers:** `Authorization: Bearer <token>`

**Resposta `200`:**
```json
{
  "data": {
    "id": "26dc454e-811f-4e79-9093-d00e2f902ba1",
    "slug": "BYWsMEgIRzSGFAuUOE_dpg==",
    "name": "Vanderleia Santos",
    "email": "vanderleia@email.com",
    "phone": "(11) 91234-5678",
    "cpf": "111.222.333-44",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "active": true,
    "createdAt": "2026-06-06T03:41:07.281Z",
    "updatedAt": "2026-06-06T03:41:07.281Z"
  }
}
```

**Erros:**
- `401` — token ausente ou inválido

---

## Usuários — `/users` 🔒

> Todas as rotas de usuário exigem `Authorization: Bearer <token>`.

O parâmetro `:slugUsuario` é o campo `slug` retornado no registro/login.

---

### `GET /users`
Lista todos os usuários ordenados por data de criação.

**Resposta `200`:**
```json
{
  "data": [
    {
      "id": "26dc454e-...",
      "slug": "BYWsMEgIRzSGFAuUOE_dpg==",
      "name": "Vanderleia Santos",
      "email": "vanderleia@email.com",
      "phone": "(11) 91234-5678",
      "cpf": "111.222.333-44",
      "birthDate": "1990-05-15T00:00:00.000Z",
      "active": true,
      "createdAt": "2026-06-06T03:41:07.281Z",
      "updatedAt": "2026-06-06T03:41:07.281Z"
    }
  ],
  "total": 1
}
```

---

### `GET /users/:slugUsuario`
Retorna um usuário específico pelo slug.

**Parâmetro:** `:slugUsuario` — slug do usuário (ex: `BYWsMEgIRzSGFAuUOE_dpg==`)

**Resposta `200`:**
```json
{
  "data": {
    "id": "26dc454e-...",
    "slug": "BYWsMEgIRzSGFAuUOE_dpg==",
    "name": "Vanderleia Santos",
    "email": "vanderleia@email.com",
    "phone": "(11) 91234-5678",
    "cpf": "111.222.333-44",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "active": true,
    "createdAt": "2026-06-06T03:41:07.281Z",
    "updatedAt": "2026-06-06T03:41:07.281Z"
  }
}
```

**Erros:**
- `401` — token ausente ou inválido
- `404` — usuário não encontrado

---

### `PUT /users/:slugUsuario`
Atualiza os dados de um usuário. Todos os campos são opcionais.

**Parâmetro:** `:slugUsuario`

**Body (todos opcionais):**
```json
{
  "name": "Novo Nome",
  "email": "novo@email.com",
  "phone": "(21) 98765-4321",
  "birthDate": "1992-08-20",
  "active": false
}
```

**Validações:**
| Campo | Regra |
|---|---|
| `name` | opcional, 3–100 caracteres |
| `email` | opcional, formato válido, único |
| `phone` | opcional, formato `(DD) 9XXXX-XXXX` |
| `birthDate` | opcional, ISO date `YYYY-MM-DD` |
| `active` | opcional, boolean |

**Resposta `200`:**
```json
{
  "message": "Usuário atualizado com sucesso",
  "data": { ... }
}
```

**Erros:**
- `401` — token ausente ou inválido
- `400` — email já em uso ou usuário não encontrado
- `422` — campos inválidos

---

### `DELETE /users/:slugUsuario`
Remove um usuário.

**Parâmetro:** `:slugUsuario`

**Resposta `204`:** sem corpo.

**Erros:**
- `401` — token ausente ou inválido
- `404` — usuário não encontrado

---

## Resumo das rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Cadastrar conta |
| `POST` | `/auth/login` | ❌ | Fazer login |
| `GET` | `/auth/me` | ✅ | Dados do usuário logado |
| `GET` | `/users` | ✅ | Listar usuários |
| `GET` | `/users/:slugUsuario` | ✅ | Buscar por slug |
| `PUT` | `/users/:slugUsuario` | ✅ | Atualizar usuário |
| `DELETE` | `/users/:slugUsuario` | ✅ | Remover usuário |
| `GET` | `/health` | ❌ | Status da API |
