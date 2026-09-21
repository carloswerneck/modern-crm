# Modern CRM — API

API REST interna do Modern CRM, construída com **Next.js Route Handlers** (`src/app/api`), **Prisma** e **NextAuth**. Este documento cobre dois grupos de endpoints:

- **API interna** — usada pelo próprio front-end do CRM. Requer sessão autenticada (cookie do NextAuth).
- **Webhook de integração** — endpoint público para sistemas externos (ex: N8N) criarem/atualizarem registros no CRM. Requer API key.

## Sumário

- [Autenticação](#autenticação)
  - [API interna (sessão)](#api-interna-sessão)
  - [Webhook (API key)](#webhook-api-key)
- [Convenções](#convenções)
- [Leads](#leads)
- [Contatos — Pessoas](#contatos--pessoas)
- [Contatos — Organizações](#contatos--organizações)
- [Produtos](#produtos)
- [Atividades](#atividades)
- [Configurações](#configurações)
  - [Usuários](#usuários)
  - [Roles (perfis de acesso)](#roles-perfis-de-acesso)
  - [Grupos](#grupos)
  - [Pipelines](#pipelines)
  - [Origens de lead (Lead Sources)](#origens-de-lead-lead-sources)
  - [Tipos de lead (Lead Types)](#tipos-de-lead-lead-types)
  - [Tags](#tags)
  - [Webhooks de saída](#webhooks-de-saída)
- [Webhook de integração (N8N)](#webhook-de-integração-n8n)

---

## Autenticação

### API interna (sessão)

Todas as rotas em `/api/*` (exceto `/api/auth` e `/api/webhook/inbound`) exigem uma sessão válida do **NextAuth**. O front-end autentica via `/api/auth` (login com e-mail/senha) e o navegador passa a enviar o cookie de sessão automaticamente.

Chamando sem sessão válida, qualquer endpoint retorna:

```json
{ "error": "Unauthorized" }
```
`HTTP 401`

Login:
```
POST /api/auth/callback/credentials
```
(gerenciado pelo NextAuth — ver `src/lib/auth.ts`)

### Webhook (API key)

O endpoint `/api/webhook/inbound` não usa sessão. Autentica via header, comparando com a variável de ambiente `CRM_API_KEY`:

```
x-api-key: <sua-chave>
```
ou
```
Authorization: Bearer <sua-chave>
```

Sem chave válida:
```json
{ "success": false, "error": "API key inválida ou ausente. Envie via header 'x-api-key' ou 'Authorization: Bearer <key>'" }
```
`HTTP 401`

## Convenções

- Todos os corpos de requisição/resposta são **JSON**.
- Datas são strings **ISO 8601**.
- Validação de payload feita com **Zod**; erro de validação retorna `HTTP 400` com o detalhe do Zod em `error`.
- IDs são `string` (cuid do Prisma).
- Rotas de detalhe (`/:id`) retornam `HTTP 404` com `{ "error": "Not found" }` quando o registro não existe.

---

## Leads

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/leads` | Lista todos os leads (inclui `person`, `organization`, `stage`, `owner`) |
| POST | `/api/leads` | Cria um lead |
| GET | `/api/leads/:id` | Detalhe do lead (inclui relações e tags) |
| PUT | `/api/leads/:id` | Atualiza um lead |
| DELETE | `/api/leads/:id` | Remove um lead |
| PATCH | `/api/leads/:id/stage` | Move o lead para outra etapa do pipeline (drag-and-drop do kanban) |

**POST /api/leads** — body:
```json
{
  "title": "string (obrigatório)",
  "description": "string",
  "value": 0,
  "expectedCloseDate": "2026-01-01",
  "pipelineId": "string",
  "stageId": "string",
  "personId": "string",
  "organizationId": "string",
  "sourceId": "string",
  "typeId": "string"
}
```
Se `pipelineId`/`stageId` não forem informados, usa o pipeline padrão (`isDefault: true`) e sua primeira etapa.

**PUT /api/leads/:id** — mesmos campos do POST (todos opcionais), mais:
```json
{ "ownerId": "string", "lostReason": "string" }
```

**PATCH /api/leads/:id/stage** — body:
```json
{ "stageId": "string (obrigatório)" }
```

---

## Contatos — Pessoas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/contacts/persons` | Lista pessoas (inclui `organization`) |
| POST | `/api/contacts/persons` | Cria uma pessoa |

**POST** — body:
```json
{
  "firstName": "string (obrigatório)",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "jobTitle": "string",
  "organizationId": "string"
}
```

## Contatos — Organizações

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/contacts/organizations` | Lista organizações |
| POST | `/api/contacts/organizations` | Cria uma organização |

**POST** — body:
```json
{
  "name": "string (obrigatório)",
  "email": "string",
  "phone": "string",
  "website": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "country": "string"
}
```

---

## Produtos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/products` | Lista produtos. Aceita `?search=` (busca em `name` e `sku`) |
| POST | `/api/products` | Cria um produto |
| GET | `/api/products/:id` | Detalhe do produto |
| PUT | `/api/products/:id` | Atualiza um produto |
| DELETE | `/api/products/:id` | Remove um produto |

**POST** — body:
```json
{
  "name": "string (obrigatório)",
  "sku": "string",
  "description": "string",
  "price": 0,
  "quantity": 0
}
```

---

## Atividades

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/activities` | Lista atividades (inclui `owner`) |
| POST | `/api/activities` | Cria uma atividade |

**POST** — body:
```json
{
  "title": "string (obrigatório)",
  "type": "CALL | MEETING | TASK | NOTE | EMAIL",
  "comment": "string",
  "location": "string",
  "scheduledAt": "2026-01-01T10:00:00Z",
  "endsAt": "2026-01-01T11:00:00Z",
  "leadId": "string",
  "personId": "string"
}
```

---

## Configurações

Todos os endpoints abaixo vivem em `/api/settings/*` e seguem o mesmo padrão: `GET`/`POST` na coleção, `PUT`/`DELETE` em `/:id`.

### Usuários

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/settings/users` | Lista usuários (inclui `role`) |
| POST | `/api/settings/users` | Cria usuário |
| PUT | `/api/settings/users/:id` | Atualiza usuário |
| DELETE | `/api/settings/users/:id` | Remove usuário |

**POST** — body:
```json
{
  "name": "string (obrigatório)",
  "email": "string (obrigatório, único)",
  "password": "string (mín. 6 caracteres)",
  "roleId": "string",
  "status": true
}
```
Retorna `409` se o e-mail já existir. Senha é armazenada com hash `bcrypt`.

### Roles (perfis de acesso)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/settings/roles` | Lista roles (com contagem de usuários) |
| POST | `/api/settings/roles` | Cria role |
| PUT | `/api/settings/roles/:id` | Atualiza role |
| DELETE | `/api/settings/roles/:id` | Remove role |

**POST** — body:
```json
{ "name": "string (obrigatório)", "description": "string", "permissions": ["string"] }
```

### Grupos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/settings/groups` | Lista grupos (com contagem de usuários) |
| POST | `/api/settings/groups` | Cria grupo |
| PUT | `/api/settings/groups/:id` | Atualiza grupo |
| DELETE | `/api/settings/groups/:id` | Remove grupo |

**POST** — body:
```json
{ "name": "string (obrigatório)", "description": "string" }
```

### Pipelines

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/settings/pipelines` | Lista pipelines (com `stages` e contagem de leads) |
| POST | `/api/settings/pipelines` | Cria pipeline (opcionalmente com etapas) |
| PUT | `/api/settings/pipelines/:id` | Atualiza pipeline/etapas |
| DELETE | `/api/settings/pipelines/:id` | Remove pipeline |

**POST** — body:
```json
{
  "name": "string (obrigatório)",
  "isDefault": false,
  "rottenDays": 30,
  "stages": [
    { "name": "string", "code": "string", "probability": 0, "sortOrder": 0 }
  ]
}
```
Marcar `isDefault: true` desmarca o pipeline padrão anterior automaticamente.

**PUT** — se `stages` for enviado, as etapas sem leads vinculados são substituídas pelas novas.

### Origens de lead (Lead Sources)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/settings/lead-sources` | Lista origens (com contagem de leads) |
| POST | `/api/settings/lead-sources` | Cria origem |
| PUT | `/api/settings/lead-sources/:id` | Atualiza origem |
| DELETE | `/api/settings/lead-sources/:id` | Remove origem |

**POST** — body: `{ "name": "string (obrigatório)" }`

### Tipos de lead (Lead Types)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/settings/lead-types` | Lista tipos (com contagem de leads) |
| POST | `/api/settings/lead-types` | Cria tipo |
| PUT | `/api/settings/lead-types/:id` | Atualiza tipo |
| DELETE | `/api/settings/lead-types/:id` | Remove tipo |

**POST** — body: `{ "name": "string (obrigatório)" }`

### Tags

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/settings/tags` | Lista tags (com contagem de leads/pessoas/organizações) |
| POST | `/api/settings/tags` | Cria tag |
| PUT | `/api/settings/tags/:id` | Atualiza tag |
| DELETE | `/api/settings/tags/:id` | Remove tag |

**POST** — body:
```json
{ "name": "string (obrigatório)", "color": "#6366f1" }
```

### Webhooks de saída

Configuração de webhooks que o CRM **dispara** para fora (diferente do endpoint de entrada abaixo).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/settings/webhooks` | Lista webhooks configurados |
| POST | `/api/settings/webhooks` | Cria webhook |
| PUT | `/api/settings/webhooks/:id` | Atualiza webhook |
| DELETE | `/api/settings/webhooks/:id` | Remove webhook |

**POST** — body:
```json
{
  "name": "string (obrigatório)",
  "url": "string (URL válida, obrigatório)",
  "event": "string (obrigatório)",
  "method": "POST",
  "active": true
}
```

---

## Webhook de integração (N8N)

Endpoint público (autenticado por API key) para sistemas externos criarem e atualizarem dados no CRM — usado pela automação com **N8N**.

```
POST /api/webhook/inbound
GET  /api/webhook/inbound   (retorna esta documentação em JSON)
```

**Headers:**
```
Content-Type: application/json
x-api-key: <CRM_API_KEY>
```

**Body:**
```json
{ "action": "create_lead", "data": { } }
```

### Ações disponíveis

| Ação | Descrição |
|---|---|
| `create_lead` | Cria um lead; opcionalmente cria/vincula pessoa, organização, pipeline/etapa e origem por nome/e-mail |
| `create_person` | Cria pessoa, ou atualiza se já existir pelo `email` |
| `create_organization` | Cria organização, ou atualiza se já existir pelo `name` |
| `create_activity` | Cria atividade e vincula a lead (`leadId`) e/ou pessoa (`personEmail`) |
| `create_product` | Cria produto |
| `create_email` | Registra um e-mail no CRM e vincula à pessoa pelo campo `from` |
| `update_lead` | Atualiza lead existente (requer `id`) |
| `update_person` | Atualiza pessoa existente (requer `id` ou `email`) |
| `update_organization` | Atualiza organização existente (requer `id` ou `name`) |

### Campos por ação

**`create_lead`**
```json
{
  "title": "string (obrigatório)",
  "description": "string",
  "value": 0,
  "expectedCloseDate": "2026-01-01",
  "personEmail": "string",
  "personName": "string",
  "personLastName": "string",
  "personPhone": "string",
  "organizationName": "string",
  "organizationEmail": "string",
  "organizationPhone": "string",
  "pipelineName": "string",
  "stageName": "string",
  "sourceName": "string"
}
```

**`create_person`**
```json
{
  "firstName": "string (obrigatório)",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "jobTitle": "string",
  "organizationName": "string"
}
```

**`create_organization`**
```json
{
  "name": "string (obrigatório)",
  "email": "string",
  "phone": "string",
  "website": "string",
  "address": "string",
  "city": "string",
  "state": "string",
  "country": "string"
}
```

**`create_activity`**
```json
{
  "title": "string (obrigatório)",
  "type": "CALL | MEETING | TASK | NOTE | EMAIL",
  "comment": "string",
  "location": "string",
  "scheduledAt": "2026-01-01T10:00:00Z",
  "endsAt": "2026-01-01T11:00:00Z",
  "isDone": false,
  "leadId": "string",
  "personEmail": "string"
}
```

**`create_product`**
```json
{ "name": "string (obrigatório)", "sku": "string", "description": "string", "price": 0, "quantity": 0 }
```

**`create_email`**
```json
{
  "subject": "string",
  "body": "string",
  "from": "string",
  "to": "string | string[]",
  "cc": "string | string[]",
  "folder": "string (inbox, sent, etc)"
}
```

**`update_lead`**
```json
{ "id": "string (obrigatório)", "title": "string", "description": "string", "value": 0, "lostReason": "string" }
```

**`update_person`**
```json
{ "id": "string", "email": "string", "firstName": "string", "lastName": "string", "phone": "string", "jobTitle": "string" }
```

**`update_organization`**
```json
{ "id": "string", "name": "string", "email": "string", "phone": "string", "website": "string", "address": "string", "city": "string", "state": "string", "country": "string" }
```

### Exemplo — criar lead a partir de um formulário

```bash
curl -X POST https://seu-dominio.com/api/webhook/inbound \
  -H "Content-Type: application/json" \
  -H "x-api-key: SUA_CHAVE" \
  -d '{
    "action": "create_lead",
    "data": {
      "title": "Lead do site",
      "value": 5000,
      "personEmail": "cliente@email.com",
      "personName": "João",
      "personLastName": "Silva",
      "personPhone": "(11) 99999-9999",
      "organizationName": "Empresa XYZ",
      "sourceName": "Website"
    }
  }'
```

### Resposta

Sucesso:
```json
{ "success": true, "action": "create_lead", "data": { } }
```

Erro de validação/regra de negócio: `HTTP 400`
```json
{ "success": false, "error": "mensagem" }
```

Erro interno: `HTTP 500`
```json
{ "success": false, "error": "mensagem" }
```
