# Amigos da Vanderleia — API

Backend da plataforma **Amigos da Vanderleia**, um assistente financeiro para pequenos produtores rurais que integra gestão via web com atendimento inteligente pelo WhatsApp.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Fluxo do WhatsApp com IA](#fluxo-do-whatsapp-com-ia)
- [Instalação](#instalação)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Executando](#executando)
- [Banco de Dados](#banco-de-dados)
- [Rotas da API](#rotas-da-api)
- [Modelos de Dados](#modelos-de-dados)

---

## Visão Geral

O sistema permite que produtores rurais:

- Cadastrem e acompanhem gastos e receitas via **web** ou **WhatsApp**
- Recebam respostas automáticas de uma IA (Vanderleia) que entende linguagem natural
- Registrem transações financeiras apenas falando ou digitando no WhatsApp (áudio incluído)
- Consultem dashboard com saldo, evolução mensal e gastos por categoria
- Gerenciem estoque de insumos com alertas de nível mínimo

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express 5 |
| ORM (relacional) | TypeORM |
| Banco relacional | PostgreSQL (Neon) |
| Banco de documentos | MongoDB (Mongoose) |
| IA conversacional | OpenAI GPT-4o-mini (function calling) |
| Transcrição de áudio | OpenAI Whisper |
| WhatsApp | Uazap (Uazapi) |
| Autenticação | JWT (jsonwebtoken) |
| Validação | class-validator + class-transformer |
| Hashing | bcrypt |

---

## Arquitetura

```
src/
├── api/controllers/          # Controladores HTTP (entrada/saída)
├── application/
│   ├── dtos/                 # Data Transfer Objects com validações
│   ├── interfaces/           # Contratos TypeScript
│   └── services/             # Regras de negócio
├── config/                   # Configurações de banco de dados
├── data/
│   ├── Infra.PG/             # Entidades TypeORM (PostgreSQL)
│   ├── Infra.Documents/      # Schemas Mongoose (MongoDB)
│   └── migrations/           # Migrations TypeORM
├── external/whatsapp/
│   ├── config/               # Conexão MongoDB
│   ├── interfaces/           # Tipos do webhook Uazap
│   └── services/             # AiService, UazapService, TranscriptionService
├── infra/repositories/       # Repositórios de acesso a dados
├── middlewares/              # Autenticação JWT, validação de DTO
├── routes/                   # Definição das rotas Express
├── shared/utils/             # Funções utilitárias (normalizePhone, generateSlug)
├── app.ts                    # Configuração do Express
└── server.ts                 # Entry point (inicializa DBs e sobe o servidor)
```

**PostgreSQL** armazena dados de usuários (cadastro, autenticação, verificação de telefone).  
**MongoDB** armazena conversas, mensagens, transações financeiras e estoque — dados flexíveis e de alto volume.

---

## Fluxo do WhatsApp com IA

```
Usuário envia mensagem (texto ou áudio)
        │
        ▼
Webhook Uazap → POST /whatsapp/webhook
        │
        ├─ [áudio] → Whisper (OpenAI) → transcrição em texto
        │
        ├─ Deduplicação por messageId (evita reprocessamento)
        │
        ├─ Verifica se usuário está verificado (Postgres)
        │   └─ Se não: envia mensagem pedindo vínculo e para
        │
        ├─ Salva mensagem inbound no MongoDB
        │
        ├─ GPT-4o-mini com function calling
        │   ├─ [detecta gasto/receita] → chama registrar_transacao
        │   │       └─ salva Transaction no MongoDB
        │   ├─ [detecta consulta financeira] → chama consultar_transacoes
        │   │       └─ busca no MongoDB e retorna dados reais
        │   └─ [conversa geral] → responde normalmente
        │
        ├─ Salva resposta outbound no MongoDB
        │
        └─ Envia resposta via Uazap
```

### Exemplos de interação

| Mensagem do usuário | Ação da IA |
|---|---|
| "Comprei 300 sacas de soja por R$ 45.000" | Registra receita no MongoDB |
| "Gastei 1200 reais em herbicida hoje" | Registra despesa (insumos) |
| "Quanto gastei esse mês?" | Consulta transações e retorna resumo |
| "Qual meu balanço de maio?" | Consulta receitas e despesas de maio |
| "Áudio falando sobre compra de diesel" | Whisper transcreve → mesmo fluxo acima |

---

## Instalação

```bash
git clone <repo>
cd 22-amigosdavanderleia-back
npm install
```

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
PORT=3000

# PostgreSQL (Neon ou local)
DATABASE_URL=postgresql://user:password@host/db?sslmode=require

# JWT
JWT_SECRET=seu_secret_aqui
JWT_EXPIRES_IN=7d

# MongoDB
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/

# Uazap (WhatsApp)
UAZAP_BASE_URL=https://sua-instancia.uazapi.com
UAZAP_TOKEN=seu-token-aqui
UAZAP_INSTANCE=nome-da-instancia

# OpenAI (GPT-4o-mini + Whisper)
OPENAI_API_KEY=sk-proj-...

# CORS (opcional, padrão: *)
CORS_ORIGIN=https://seu-frontend.com
```

---

## Executando

### Desenvolvimento (hot reload)
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

### Migrations
```bash
# Executar migrations pendentes
npm run migration:run

# Reverter última migration
npm run migration:revert

# Ver status das migrations
npm run migration:show

# Gerar nova migration (após alterar entidades)
npm run migration:generate -- NomeDaMigration
```

---

## Banco de Dados

### PostgreSQL — Usuários

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID | Chave primária |
| `slug` | varchar | Identificador público (base64, usado nas rotas) |
| `name` | varchar | Nome completo |
| `email` | varchar | Único |
| `password` | varchar | Hash bcrypt |
| `phone` | varchar | Formato `+55DDXXXXXXXXX` |
| `cpf` | varchar | Único |
| `birth_date` | date | Data de nascimento |
| `active` | boolean | Conta ativa |
| `phone_verified` | boolean | WhatsApp vinculado |
| `created_at` | timestamp | — |
| `updated_at` | timestamp | — |

### MongoDB — Collections

| Collection | Descrição |
|---|---|
| `conversations` | Uma por número de telefone. Status: `pending_otp`, `active`, `closed` |
| `messages` | Histórico de todas as mensagens (inbound/outbound). Usado como contexto da IA |
| `transactions` | Gastos e receitas. Origem: `web` ou `whatsapp` |
| `otptokens` | Códigos OTP temporários (expiram em 5 min, máx 3 tentativas) |
| `estoqueitems` | Itens de estoque com quantidade atual e mínimo |
| `estoquemovimentacaos` | Histórico de entradas e saídas do estoque |

---

## Rotas da API

Base URL: `http://localhost:3000`

Rotas com 🔒 exigem `Authorization: Bearer <token>`.

### Auth

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Cadastrar conta (dispara OTP no WhatsApp) |
| `POST` | `/auth/login` | ❌ | Login, retorna JWT |
| `GET` | `/auth/me` | 🔒 | Dados do usuário logado |

### Usuários

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/users/:slug` | 🔒 | Buscar usuário pelo slug |
| `PUT` | `/users/:slug` | 🔒 | Atualizar dados do usuário |
| `DELETE` | `/users/:slug` | 🔒 | Remover usuário |

### Financeiro — `/users/:slug/financeiro`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/dashboard` | 🔒 | Saldo, entradas/saídas, evolução 6 meses, últimas movimentações |
| `GET` | `/lancamentos` | 🔒 | Listar lançamentos (filtros: `tipo`, `categoria`, `busca`, `mes`) |
| `POST` | `/lancamentos` | 🔒 | Criar lançamento manualmente |
| `DELETE` | `/lancamentos/:id` | 🔒 | Deletar lançamento |

**Query params de `/lancamentos`:**

| Param | Valores | Exemplo |
|---|---|---|
| `tipo` | `despesa`, `receita` | `?tipo=despesa` |
| `categoria` | `insumos`, `maquinario`, `mao_de_obra`, `combustivel`, `arrendamento`, `receitas`, `outros` | `?categoria=insumos` |
| `busca` | texto livre | `?busca=diesel` |
| `mes` | `YYYY-MM` | `?mes=2026-05` |

**Body de `POST /lancamentos`:**
```json
{
  "type": "despesa",
  "description": "Herbicida Glifosato",
  "value": 4800.00,
  "date": "2026-05-27",
  "category": "insumos",
  "origin": "web"
}
```

### Estoque — `/users/:slug/estoque`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/` | 🔒 | Listar itens (filtro: `?categoria=`) |
| `POST` | `/` | 🔒 | Criar item |
| `GET` | `/resumo` | 🔒 | Total de itens, em alerta e por categoria |
| `GET` | `/alertas` | 🔒 | Itens abaixo do estoque mínimo |
| `GET` | `/movimentacoes` | 🔒 | Histórico de entradas/saídas |
| `GET` | `/:id` | 🔒 | Buscar item por ID |
| `PUT` | `/:id` | 🔒 | Atualizar item |
| `DELETE` | `/:id` | 🔒 | Deletar item e seu histórico |
| `POST` | `/:id/movimentar` | 🔒 | Registrar entrada ou saída |

**Body de `POST /` (criar item):**
```json
{
  "nome": "Herbicida Glifosato",
  "categoria": "defensivos",
  "quantidade": 200,
  "unidade": "L",
  "estoqueMinimo": 50,
  "descricao": "Concentrado 480g/L"
}
```

**Categorias de estoque:** `sementes`, `fertilizantes`, `defensivos`, `combustivel`, `racao`, `maquinario`, `outros`  
**Unidades:** `kg`, `L`, `sc` (saca), `un` (unidade), `t` (tonelada), `cx` (caixa)

**Body de `POST /:id/movimentar`:**
```json
{
  "tipo": "saida",
  "quantidade": 30,
  "motivo": "Aplicação talhão 3"
}
```

### WhatsApp

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/whatsapp/send-otp` | 🔒 | Reenviar código OTP via WhatsApp |
| `POST` | `/whatsapp/verify-otp` | 🔒 | Verificar código e vincular número |
| `POST` | `/whatsapp/webhook` | ❌ | Webhook do Uazap (não chamar manualmente) |

### Sistema

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/health` | ❌ | Status da API |

---

## Testando o Webhook Localmente

Para simular uma mensagem de WhatsApp sem precisar de um número real:

```bash
curl -X POST http://localhost:3000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "message",
    "BaseUrl": "https://guiar.uazapi.com",
    "instanceName": "test",
    "chat": {
      "phone": "555599978307",
      "name": "Produtor Teste",
      "wa_chatid": "555599978307@s.whatsapp.net",
      "wa_isGroup": false
    },
    "message": {
      "text": "Gastei 1500 reais em semente de milho hoje",
      "content": "Gastei 1500 reais em semente de milho hoje",
      "fromMe": false,
      "wasSentByApi": false,
      "isGroup": false,
      "messageTimestamp": 1749254400,
      "messageid": "TESTE001",
      "type": "text",
      "mediaType": null
    }
  }'
```

> Troque `messageid` a cada teste (`TESTE002`, `TESTE003`...) pois o sistema deduplica por ele.
