# Controle de Estoque — Documentação de Rotas

Base URL: `http://localhost:3000` (dev) / `https://two2-amigosdavanderleia-back.onrender.com` (prod)

Todas as rotas exigem:
```
Authorization: Bearer <token>
```

Base das rotas: `/users/:slugUsuario/estoque`

---

## Tipos aceitos

### Categorias (`categoria`)
| Valor | Descrição |
|---|---|
| `sementes` | Sementes e mudas |
| `fertilizantes` | Adubos e fertilizantes |
| `defensivos` | Herbicidas, fungicidas, inseticidas |
| `combustivel` | Diesel, gasolina, óleo |
| `racao` | Ração animal |
| `maquinario` | Peças e equipamentos |
| `outros` | Demais itens |

### Unidades (`unidade`)
| Valor | Descrição |
|---|---|
| `kg` | Quilogramas |
| `L` | Litros |
| `sc` | Sacas |
| `un` | Unidades |
| `t` | Toneladas |
| `cx` | Caixas |

---

## Rotas

### `GET /users/:slugUsuario/estoque`
Lista todos os itens do estoque. Retorna o campo `emAlerta: true` quando a quantidade está no nível mínimo ou abaixo.

**Query params (opcionais):**
- `categoria` — filtra por categoria

**Resposta `200`:**
```json
{
  "data": [
    {
      "_id": "664abc...",
      "userSlug": "abc123==",
      "nome": "Roundup 4L",
      "categoria": "defensivos",
      "quantidade": 8,
      "unidade": "L",
      "estoqueMinimo": 10,
      "descricao": "Herbicida para pré-plantio",
      "emAlerta": true,
      "createdAt": "2026-06-06T00:00:00.000Z",
      "updatedAt": "2026-06-06T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### `POST /users/:slugUsuario/estoque`
Cadastra um novo item no estoque.

**Body:**
```json
{
  "nome": "Ureia 50kg",
  "categoria": "fertilizantes",
  "quantidade": 20,
  "unidade": "sc",
  "estoqueMinimo": 5,
  "descricao": "Para cobertura do milho"
}
```

**Resposta `201`:** item criado.

**Erros:**
- `422` — campos inválidos

---

### `GET /users/:slugUsuario/estoque/:id`
Busca um item pelo ID.

**Resposta `200`:** item com `emAlerta`.

**Erros:**
- `404` — item não encontrado

---

### `PUT /users/:slugUsuario/estoque/:id`
Atualiza metadados do item (nome, categoria, unidade, estoqueMinimo, descricao). **Não altera quantidade diretamente — use `/movimentar`.**

**Body (todos opcionais):**
```json
{
  "nome": "Roundup 5L",
  "estoqueMinimo": 15,
  "descricao": "Atualizado"
}
```

**Resposta `200`:** item atualizado com `emAlerta`.

---

### `DELETE /users/:slugUsuario/estoque/:id`
Remove o item e todo seu histórico de movimentações.

**Resposta `204`:** sem corpo.

---

### `POST /users/:slugUsuario/estoque/:id/movimentar`
Registra uma entrada ou saída de estoque. Atualiza a quantidade automaticamente.

**Body:**
```json
{
  "tipo": "entrada",
  "quantidade": 10,
  "motivo": "Compra NF 1234"
}
```

ou

```json
{
  "tipo": "saida",
  "quantidade": 3,
  "motivo": "Aplicação talhão 2"
}
```

**Resposta `200`:** item com quantidade atualizada e `emAlerta`.

**Erros:**
- `400` — quantidade insuficiente para saída
- `422` — campos inválidos

---

### `GET /users/:slugUsuario/estoque/alertas`
Lista apenas os itens com quantidade ≤ estoque mínimo. Útil para o badge de alertas no dashboard.

**Resposta `200`:**
```json
{
  "data": [ /* itens em alerta */ ],
  "total": 2
}
```

---

### `GET /users/:slugUsuario/estoque/resumo`
Resumo rápido para o card do dashboard.

**Resposta `200`:**
```json
{
  "data": {
    "totalItens": 12,
    "emAlerta": 3,
    "porCategoria": {
      "defensivos": 4,
      "fertilizantes": 3,
      "sementes": 2,
      "combustivel": 2,
      "outros": 1
    }
  }
}
```

---

### `GET /users/:slugUsuario/estoque/movimentacoes`
Histórico de movimentações (entradas e saídas).

**Query params (opcionais):**
- `itemId` — filtra por item específico
- `limite` — quantidade de registros (padrão: 50)

**Resposta `200`:**
```json
{
  "data": [
    {
      "_id": "664def...",
      "itemId": { "_id": "664abc...", "nome": "Roundup 4L", "unidade": "L", "categoria": "defensivos" },
      "userSlug": "abc123==",
      "tipo": "saida",
      "quantidade": 2,
      "motivo": "Aplicação talhão 3",
      "origem": "web",
      "data": "2026-06-06T10:30:00.000Z"
    }
  ],
  "total": 1
}
```

---

## Resumo das rotas

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/users/:slug/estoque` | Listar itens (com alerta) |
| `POST` | `/users/:slug/estoque` | Criar item |
| `GET` | `/users/:slug/estoque/alertas` | Itens abaixo do mínimo |
| `GET` | `/users/:slug/estoque/resumo` | Resumo para dashboard |
| `GET` | `/users/:slug/estoque/movimentacoes` | Histórico de movimentações |
| `GET` | `/users/:slug/estoque/:id` | Buscar item por ID |
| `PUT` | `/users/:slug/estoque/:id` | Atualizar metadados |
| `DELETE` | `/users/:slug/estoque/:id` | Remover item |
| `POST` | `/users/:slug/estoque/:id/movimentar` | Entrada ou saída |
