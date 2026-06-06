# Documentação de Rotas — Amigos da Vanderleia

Base URL produção: `https://<seu-app>.onrender.com`  
Base URL local: `http://localhost:3000`

Rotas protegidas (🔒) exigem o header:
```
Authorization: Bearer <token>
```

O `<slugUsuario>` é o campo `slug` retornado no login/registro.

---

## Auth — `/auth`

### `POST /auth/register`
Cria uma nova conta e retorna o token de acesso. Dispara OTP via WhatsApp automaticamente.

**Body:**
```json
{
  "name": "Vitor Schumacher",
  "email": "vitor@email.com",
  "password": "senha123",
  "phone": "(51) 99997-8307",
  "cpf": "031.439.030-82",
  "birthDate": "1995-06-02"
}
```

**Validações:**
| Campo | Regra |
|---|---|
| `name` | obrigatório, 3–100 caracteres |
| `email` | formato válido, único |
| `password` | mínimo 6 caracteres |
| `phone` | formato `(DD) 9XXXX-XXXX` |
| `cpf` | formato `000.000.000-00`, único |
| `birthDate` | `YYYY-MM-DD` |

**Resposta `201`:**
```json
{
  "token": "eyJhbGci...",
  "type": "Bearer",
  "expiresIn": "7d",
  "user": {
    "slug": "fqbKACpbSPmAGFa_0npIKg==",
    "name": "Vitor Schumacher",
    "email": "vitor@email.com"
  }
}
```

**Erros:**
- `422` — campos inválidos
- `409` — email ou CPF já cadastrado

---

### `POST /auth/login`
Autentica e retorna o token.

**Body:**
```json
{
  "email": "vitor@email.com",
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
    "slug": "fqbKACpbSPmAGFa_0npIKg==",
    "name": "Vitor Schumacher",
    "email": "vitor@email.com"
  }
}
```

**Erros:**
- `401` — credenciais inválidas ou conta desativada
- `422` — campos inválidos

---

### `GET /auth/me` 🔒
Retorna dados do usuário autenticado.

**Resposta `200`:**
```json
{
  "data": {
    "id": "96b1bd2c-18c4-4059-b0b4-0740c6949270",
    "slug": "fqbKACpbSPmAGFa_0npIKg==",
    "name": "Vitor Schumacher",
    "email": "vitor@email.com",
    "phone": "+5551999978307",
    "cpf": "031.439.030-82",
    "birthDate": "1995-06-02T00:00:00.000Z",
    "active": true,
    "phoneVerified": true,
    "createdAt": "2026-06-06T04:21:10.288Z",
    "updatedAt": "2026-06-06T04:21:10.288Z"
  }
}
```

**Erros:**
- `401` — token ausente ou inválido

---

## Usuários — `/users` 🔒

### `GET /users/:slugUsuario`
Retorna um usuário pelo slug.

**Resposta `200`:**
```json
{
  "data": {
    "id": "96b1bd2c-...",
    "slug": "fqbKACpbSPmAGFa_0npIKg==",
    "name": "Vitor Schumacher",
    "email": "vitor@email.com",
    "phone": "+5551999978307",
    "cpf": "031.439.030-82",
    "birthDate": "1995-06-02T00:00:00.000Z",
    "active": true,
    "phoneVerified": true,
    "createdAt": "2026-06-06T04:21:10.288Z",
    "updatedAt": "2026-06-06T04:21:10.288Z"
  }
}
```

**Erros:** `401`, `404`

---

### `PUT /users/:slugUsuario` 🔒
Atualiza dados do usuário. Todos os campos são opcionais.

**Body:**
```json
{
  "name": "Novo Nome",
  "email": "novo@email.com",
  "phone": "(51) 99997-8307",
  "birthDate": "1995-06-02",
  "active": true
}
```

**Resposta `200`:**
```json
{
  "message": "Usuário atualizado com sucesso",
  "data": { "...campos atualizados..." }
}
```

**Erros:** `400`, `401`, `422`

---

### `DELETE /users/:slugUsuario` 🔒
Remove um usuário.

**Resposta `204`:** sem corpo.

**Erros:** `401`, `404`

---

## Financeiro — `/users/:slugUsuario/financeiro` 🔒

> Todas as rotas financeiras são escopadas por usuário via `:slugUsuario`.

---

### `GET /users/:slugUsuario/financeiro/dashboard`
Retorna os dados completos do dashboard: saldo, entradas/saídas do mês, evolução mensal (últimos 6 meses), gastos por categoria e últimas 10 movimentações.

**Query params (opcionais):**
| Param | Tipo | Descrição |
|---|---|---|
| `mes` | `YYYY-MM` | Mês de referência. Padrão: mês atual. |

**Exemplo:** `GET /users/fqbKACpbSPmAGFa_0npIKg==/financeiro/dashboard?mes=2026-06`

**Resposta `200`:**
```json
{
  "data": {
    "saldoAtual": 18900.00,
    "entradasMes": 47500.00,
    "saidasMes": 43600.00,
    "resultado": 3900.00,
    "gastosPorCategoria": {
      "insumos": 35400.00,
      "maquinario": 7700.00,
      "mao_de_obra": 5400.00,
      "combustivel": 13300.00,
      "arrendamento": 8000.00
    },
    "evolucao": [
      { "mes": "2026-01", "receitas": 0, "despesas": 0 },
      { "mes": "2026-02", "receitas": 0, "despesas": 0 },
      { "mes": "2026-03", "receitas": 15000, "despesas": 12000 },
      { "mes": "2026-04", "receitas": 34500, "despesas": 26200 },
      { "mes": "2026-05", "receitas": 47500, "despesas": 43600 },
      { "mes": "2026-06", "receitas": 0, "despesas": 0 }
    ],
    "ultimasMovimentacoes": [
      {
        "_id": "683f...",
        "userSlug": "fqbKACpbSPmAGFa_0npIKg==",
        "type": "despesa",
        "description": "Herbicida Glifosato",
        "value": 4800.00,
        "date": "2026-05-27T00:00:00.000Z",
        "category": "insumos",
        "origin": "whatsapp",
        "createdAt": "2026-06-06T10:00:00.000Z"
      }
    ]
  }
}
```

---

### `GET /users/:slugUsuario/financeiro/lancamentos`
Lista lançamentos com filtros opcionais.

**Query params (todos opcionais):**
| Param | Tipo | Valores | Descrição |
|---|---|---|---|
| `tipo` | string | `despesa`, `receita` | Filtra por tipo |
| `categoria` | string | ver tabela abaixo | Filtra por categoria |
| `busca` | string | qualquer texto | Busca na descrição (case-insensitive) |
| `mes` | `YYYY-MM` | ex: `2026-05` | Filtra por mês |

**Categorias disponíveis:**
| Valor | Label no frontend |
|---|---|
| `insumos` | Insumos |
| `maquinario` | Maquinário |
| `mao_de_obra` | Mão de Obra |
| `combustivel` | Combustível |
| `arrendamento` | Arrendamento |
| `receitas` | Receitas |
| `outros` | Outros |

**Exemplo:** `GET /users/fqbKACpbSPmAGFa_0npIKg==/financeiro/lancamentos?tipo=despesa&mes=2026-05`

**Resposta `200`:**
```json
{
  "data": [
    {
      "_id": "683f...",
      "userSlug": "fqbKACpbSPmAGFa_0npIKg==",
      "type": "despesa",
      "description": "Herbicida Glifosato",
      "value": 4800.00,
      "date": "2026-05-27T00:00:00.000Z",
      "category": "insumos",
      "origin": "whatsapp",
      "rawMessage": "Comprei herbicida glifosato por 4800 reais",
      "createdAt": "2026-06-06T10:00:00.000Z",
      "updatedAt": "2026-06-06T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### `POST /users/:slugUsuario/financeiro/lancamentos` 🔒
Cria um novo lançamento manualmente (via formulário web).

**Body:**
```json
{
  "type": "despesa",
  "description": "Reparo trator John Deere",
  "value": 4500.00,
  "date": "2026-04-09",
  "category": "maquinario",
  "origin": "web"
}
```

**Validações:**
| Campo | Obrigatório | Regra |
|---|---|---|
| `type` | ✅ | `"despesa"` ou `"receita"` |
| `description` | ✅ | string não vazia |
| `value` | ✅ | número > 0 |
| `date` | ✅ | `YYYY-MM-DD` |
| `category` | ❌ | um dos valores da tabela acima. Padrão: `"outros"` |
| `origin` | ❌ | `"web"` ou `"whatsapp"`. Padrão: `"web"` |

**Resposta `201`:**
```json
{
  "data": {
    "_id": "683f...",
    "userSlug": "fqbKACpbSPmAGFa_0npIKg==",
    "type": "despesa",
    "description": "Reparo trator John Deere",
    "value": 4500.00,
    "date": "2026-04-09T00:00:00.000Z",
    "category": "maquinario",
    "origin": "web",
    "createdAt": "2026-06-06T10:00:00.000Z",
    "updatedAt": "2026-06-06T10:00:00.000Z"
  }
}
```

**Erros:**
- `400` — dados inválidos
- `401` — não autenticado
- `422` — falha de validação (`{ "message": "Erro de validação", "errors": [...] }`)

---

### `DELETE /users/:slugUsuario/financeiro/lancamentos/:id` 🔒
Remove um lançamento pelo `_id` do MongoDB.

**Parâmetro:** `:id` — `_id` do lançamento (ex: `683f1a2b3c4d5e6f7a8b9c0d`)

**Resposta `204`:** sem corpo.

**Erros:**
- `401` — não autenticado
- `404` — lançamento não encontrado ou não pertence ao usuário

---

## WhatsApp — `/whatsapp`

### `POST /whatsapp/send-otp` 🔒
Reenvia código OTP via WhatsApp. Usar quando o usuário não recebeu no cadastro.

**Resposta `200`:**
```json
{ "message": "Código enviado para +5551999978307 via WhatsApp" }
```

**Erros:** `400` — número já verificado / sem telefone cadastrado

---

### `POST /whatsapp/verify-otp` 🔒
Valida o código OTP e ativa o WhatsApp do usuário.

**Body:**
```json
{ "code": "123456" }
```

**Resposta `200`:**
```json
{ "message": "WhatsApp vinculado com sucesso!" }
```

**Erros:**
- `400` — código incorreto / expirado / tentativas excedidas

---

### `POST /whatsapp/webhook`
Endpoint público chamado pelo Uazap ao receber mensagens. Processa de forma assíncrona:
- Transcreve áudio via Whisper (OpenAI) se for mensagem de voz
- Gera resposta via GPT-4o-mini com function calling
- Salva transação automaticamente se o usuário reportar gasto ou receita
- Salva histórico de mensagens no MongoDB

**Resposta `200`:** sem corpo (imediata para evitar timeout do Uazap)

---

## Saúde

### `GET /health`
Verifica se a API está no ar.

**Resposta `200`:**
```json
{ "status": "ok" }
```

---

## Resumo de todas as rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Cadastrar conta |
| `POST` | `/auth/login` | ❌ | Fazer login |
| `GET` | `/auth/me` | ✅ | Dados do usuário logado |
| `GET` | `/users/:slugUsuario` | ✅ | Buscar usuário por slug |
| `PUT` | `/users/:slugUsuario` | ✅ | Atualizar usuário |
| `DELETE` | `/users/:slugUsuario` | ✅ | Remover usuário |
| `GET` | `/users/:slugUsuario/financeiro/dashboard` | ✅ | Dashboard completo |
| `GET` | `/users/:slugUsuario/financeiro/lancamentos` | ✅ | Listar lançamentos com filtros |
| `POST` | `/users/:slugUsuario/financeiro/lancamentos` | ✅ | Criar lançamento |
| `DELETE` | `/users/:slugUsuario/financeiro/lancamentos/:id` | ✅ | Deletar lançamento |
| `POST` | `/whatsapp/send-otp` | ✅ | Enviar OTP via WhatsApp |
| `POST` | `/whatsapp/verify-otp` | ✅ | Verificar OTP e vincular número |
| `POST` | `/whatsapp/webhook` | ❌ | Webhook Uazap (mensagens recebidas) |
| `GET` | `/health` | ❌ | Status da API |
