// Definição estruturada da API, usada pela página /docs.
// Mantenha em sincronia com API.md e com os handlers em src/app/api.

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AuthKind = "session" | "apikey" | "none";

export interface Param {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  /** Valor fixo: o campo é mostrado, mas não editável. */
  fixed?: boolean;
  /** Campo que só agrupa outros (ex.: "data"): não tem input próprio. */
  noInput?: boolean;
}

export interface ApiResponse {
  status: number;
  description: string;
  body?: unknown;
}

export interface Endpoint {
  kind: "endpoint";
  id: string;
  title: string;
  method: Method;
  path: string;
  auth: AuthKind;
  description: string;
  pathParams?: Param[];
  queryParams?: Param[];
  bodyParams?: Param[];
  bodyExample?: unknown;
  responses: ApiResponse[];
}

export interface Guide {
  kind: "guide";
  id: string;
  title: string;
  description: string;
  sections: { heading: string; text?: string; code?: string }[];
}

export type Entry = Endpoint | Guide;

export interface Group {
  id: string;
  title: string;
  entries: Entry[];
}

const UNAUTHORIZED: ApiResponse = {
  status: 401,
  description: "Sem sessão válida",
  body: { error: "Unauthorized" },
};
const NOT_FOUND: ApiResponse = {
  status: 404,
  description: "Registro não encontrado",
  body: { error: "Not found" },
};
const BAD_REQUEST: ApiResponse = {
  status: 400,
  description: "Erro de validação (detalhe do Zod em `error`)",
  body: { error: "..." },
};
const OK_DELETE: ApiResponse = {
  status: 200,
  description: "Removido com sucesso",
  body: { success: true },
};

const idParam = (what: string): Param[] => [
  { name: "id", type: "string", required: true, description: `ID (cuid) ${what}` },
];

interface CrudOpts {
  slug: string;
  singular: string;
  plural: string;
  basePath: string;
  createBody: Param[];
  createExample: unknown;
  listNote?: string;
  detail?: boolean;
  extraCreateResponses?: ApiResponse[];
}

/** Gera as entradas padrão GET/POST (+ detalhe/PUT/DELETE) de um recurso. */
function crud(o: CrudOpts, withDetailAndEdit = true): Entry[] {
  const out: Endpoint[] = [
    {
      kind: "endpoint",
      id: `${o.slug}-list`,
      title: `Listar ${o.plural}`,
      method: "GET",
      path: o.basePath,
      auth: "session",
      description: `Retorna a lista de ${o.plural}.${o.listNote ? " " + o.listNote : ""}`,
      responses: [
        { status: 200, description: "Lista de registros", body: [{ id: "cm...", "...": "..." }] },
        UNAUTHORIZED,
      ],
    },
    {
      kind: "endpoint",
      id: `${o.slug}-create`,
      title: `Criar ${o.singular}`,
      method: "POST",
      path: o.basePath,
      auth: "session",
      description: `Cria ${o.singular}.`,
      bodyParams: o.createBody,
      bodyExample: o.createExample,
      responses: [
        { status: 201, description: "Registro criado", body: { id: "cm...", "...": "..." } },
        BAD_REQUEST,
        UNAUTHORIZED,
        ...(o.extraCreateResponses ?? []),
      ],
    },
  ];
  if (withDetailAndEdit) {
    out.push(
      {
        kind: "endpoint",
        id: `${o.slug}-update`,
        title: `Atualizar ${o.singular}`,
        method: "PUT",
        path: `${o.basePath}/{id}`,
        auth: "session",
        description: `Atualiza ${o.singular}. Os campos são os mesmos da criação.`,
        pathParams: idParam(""),
        bodyParams: o.createBody.map((p) => ({ ...p, required: false })),
        bodyExample: o.createExample,
        responses: [
          { status: 200, description: "Registro atualizado", body: { id: "cm...", "...": "..." } },
          BAD_REQUEST,
          UNAUTHORIZED,
        ],
      },
      {
        kind: "endpoint",
        id: `${o.slug}-delete`,
        title: `Remover ${o.singular}`,
        method: "DELETE",
        path: `${o.basePath}/{id}`,
        auth: "session",
        description: `Remove ${o.singular}.`,
        pathParams: idParam(""),
        responses: [OK_DELETE, UNAUTHORIZED],
      }
    );
  }
  return out;
}

// ─── Guias ───────────────────────────────────────────────────────────────────

const intro: Guide = {
  kind: "guide",
  id: "intro",
  title: "Introdução",
  description:
    "API REST do Modern CRM, construída com Next.js Route Handlers, Prisma e NextAuth.",
  sections: [
    {
      heading: "Dois tipos de acesso",
      text:
        "API interna: usada pelo próprio front-end e exige sessão autenticada (cookie do NextAuth). " +
        "Webhook de integração: endpoint para sistemas externos (ex.: N8N), autenticado por API key.",
    },
    {
      heading: "Convenções",
      text:
        "Corpos de requisição e resposta são JSON. Datas seguem ISO 8601. IDs são strings (cuid do Prisma). " +
        "Erros de validação retornam HTTP 400. Rotas de detalhe retornam HTTP 404 quando o registro não existe.",
    },
    {
      heading: "URL base",
      code: "{{BASE_URL}}/api",
    },
  ],
};

const authGuide: Guide = {
  kind: "guide",
  id: "authentication",
  title: "Autenticação",
  description: "Como autenticar nas duas partes da API.",
  sections: [
    {
      heading: "API interna (sessão)",
      text:
        "Todas as rotas em /api/* (exceto /api/auth e /api/webhook/inbound) exigem sessão válida. " +
        "Faça login em /login; o navegador passa a enviar o cookie automaticamente. " +
        'Sem sessão, qualquer rota retorna HTTP 401 com { "error": "Unauthorized" }.',
    },
    {
      heading: "Webhook (API key)",
      text:
        "O endpoint /api/webhook/inbound compara o header com a variável de ambiente CRM_API_KEY. " +
        "Envie a chave em um dos formatos abaixo.",
      code: "x-api-key: <sua-chave>\n# ou\nAuthorization: Bearer <sua-chave>",
    },
    {
      heading: "Sem chave válida",
      code: '{ "success": false, "error": "API key inválida ou ausente. ..." }   // HTTP 401',
    },
  ],
};

// ─── Webhook de entrada ──────────────────────────────────────────────────────

function hook(
  action: string,
  title: string,
  description: string,
  fields: Param[],
  example: Record<string, unknown>
): Endpoint {
  return {
    kind: "endpoint",
    id: `webhook-${action}`,
    title,
    method: "POST",
    path: "/api/webhook/inbound",
    auth: "apikey",
    description,
    bodyParams: [
      { name: "action", type: "string", required: true, description: `Fixo: "${action}"`, fixed: true },
      { name: "data", type: "object", required: true, description: "Campos da ação (veja abaixo)", noInput: true },
      ...fields.map((f) => ({ ...f, name: `data.${f.name}` })),
    ],
    bodyExample: { action, data: example },
    responses: [
      { status: 200, description: "Sucesso", body: { success: true, action, data: { id: "cm...", "...": "..." } } },
      {
        status: 400,
        description: "Campos obrigatórios ausentes ou regra de negócio violada",
        body: { success: false, error: "mensagem" },
      },
      {
        status: 401,
        description: "API key inválida ou ausente",
        body: { success: false, error: "API key inválida ou ausente. ..." },
      },
      { status: 500, description: "Erro interno", body: { success: false, error: "mensagem" } },
    ],
  };
}

const s = (name: string, description?: string, required = false): Param => ({
  name,
  type: "string",
  required,
  description,
});
const n = (name: string, description?: string): Param => ({ name, type: "number", description });

const webhookEntries: Entry[] = [
  {
    kind: "endpoint",
    id: "webhook-docs",
    title: "Listar ações do webhook",
    method: "GET",
    path: "/api/webhook/inbound",
    auth: "apikey",
    description: "Retorna em JSON a documentação das ações disponíveis no webhook.",
    responses: [
      { status: 200, description: "Documentação das ações", body: { name: "Modern CRM - Webhook API", version: "1.0", actions: {} } },
      { status: 401, description: "API key inválida ou ausente", body: { success: false, error: "API key inválida" } },
    ],
  },
  hook(
    "create_lead",
    "create_lead",
    "Cria um lead. Opcionalmente cria ou vincula pessoa, organização, pipeline/etapa e origem por nome/e-mail.",
    [
      s("title", "Título do lead", true),
      s("description"),
      n("value", "Valor do negócio"),
      s("expectedCloseDate", "Data ISO, ex.: 2026-01-01"),
      s("personEmail", "Vincula pessoa existente ou cria nova"),
      s("personName", "Nome da pessoa (se criar nova)"),
      s("personLastName"),
      s("personPhone"),
      s("organizationName", "Vincula organização existente ou cria nova"),
      s("organizationEmail"),
      s("organizationPhone"),
      s("pipelineName", "Nome do pipeline"),
      s("stageName", "Nome da etapa"),
      s("sourceName", "Nome da origem"),
    ],
    {
      title: "Lead do site",
      value: 5000,
      personEmail: "cliente@email.com",
      personName: "João",
      personLastName: "Silva",
      personPhone: "(11) 99999-9999",
      organizationName: "Empresa XYZ",
      sourceName: "Website",
    }
  ),
  hook(
    "create_person",
    "create_person",
    "Cria uma pessoa, ou atualiza se já existir uma com o mesmo e-mail.",
    [s("firstName", undefined, true), s("lastName"), s("email"), s("phone"), s("jobTitle"), s("organizationName")],
    { firstName: "Maria", lastName: "Souza", email: "maria@empresa.com", phone: "(11) 98888-7777" }
  ),
  hook(
    "create_organization",
    "create_organization",
    "Cria uma organização, ou atualiza se já existir uma com o mesmo nome.",
    [s("name", undefined, true), s("email"), s("phone"), s("website"), s("address"), s("city"), s("state"), s("country")],
    { name: "Empresa XYZ", email: "contato@xyz.com", city: "São Paulo", state: "SP", country: "Brasil" }
  ),
  hook(
    "create_activity",
    "create_activity",
    "Cria uma atividade e vincula a um lead (leadId) e/ou pessoa (personEmail).",
    [
      s("title", undefined, true),
      s("type", "CALL | MEETING | TASK | NOTE | EMAIL"),
      s("comment"),
      s("location"),
      s("scheduledAt", "ISO 8601"),
      s("endsAt", "ISO 8601"),
      { name: "isDone", type: "boolean" },
      s("leadId"),
      s("personEmail"),
    ],
    { title: "Ligar para o cliente", type: "CALL", scheduledAt: "2026-01-01T10:00:00Z", personEmail: "cliente@email.com" }
  ),
  hook(
    "create_product",
    "create_product",
    "Cria um produto.",
    [s("name", undefined, true), s("sku"), s("description"), n("price"), n("quantity")],
    { name: "Plano Pro", sku: "PRO-001", price: 199.9, quantity: 100 }
  ),
  hook(
    "create_email",
    "create_email",
    "Registra um e-mail no CRM e vincula à pessoa pelo campo from.",
    [
      s("subject"),
      s("body"),
      s("from"),
      { name: "to", type: "string | string[]" },
      { name: "cc", type: "string | string[]" },
      s("folder", "inbox, sent, etc."),
    ],
    { subject: "Proposta", body: "Olá...", from: "cliente@email.com", to: "vendas@empresa.com", folder: "inbox" }
  ),
  hook(
    "update_lead",
    "update_lead",
    "Atualiza um lead existente.",
    [s("id", undefined, true), s("title"), s("description"), n("value"), s("lostReason")],
    { id: "cm...", title: "Novo título", value: 7500 }
  ),
  hook(
    "update_person",
    "update_person",
    "Atualiza uma pessoa existente (informe id ou email).",
    [s("id"), s("email"), s("firstName"), s("lastName"), s("phone"), s("jobTitle")],
    { email: "maria@empresa.com", phone: "(11) 97777-6666" }
  ),
  hook(
    "update_organization",
    "update_organization",
    "Atualiza uma organização existente (informe id ou name).",
    [s("id"), s("name"), s("email"), s("phone"), s("website"), s("address"), s("city"), s("state"), s("country")],
    { name: "Empresa XYZ", website: "https://xyz.com" }
  ),
];

// ─── Leads ───────────────────────────────────────────────────────────────────

const leadBody: Param[] = [
  s("title", "Título do lead", true),
  s("description"),
  n("value"),
  s("expectedCloseDate", "Data ISO, ex.: 2026-01-01"),
  s("pipelineId", "Se omitido, usa o pipeline padrão"),
  s("stageId", "Se omitido, usa a primeira etapa do pipeline"),
  s("personId"),
  s("organizationId"),
  s("sourceId"),
  s("typeId"),
];

const leadEntries: Entry[] = [
  {
    kind: "endpoint",
    id: "leads-list",
    title: "Listar leads",
    method: "GET",
    path: "/api/leads",
    auth: "session",
    description: "Lista todos os leads, incluindo person, organization, stage e owner.",
    responses: [{ status: 200, description: "Lista de leads", body: [{ id: "cm...", title: "Lead", value: 1500 }] }, UNAUTHORIZED],
  },
  {
    kind: "endpoint",
    id: "leads-create",
    title: "Criar lead",
    method: "POST",
    path: "/api/leads",
    auth: "session",
    description: "Cria um lead. Sem pipelineId/stageId, usa o pipeline padrão e sua primeira etapa.",
    bodyParams: leadBody,
    bodyExample: { title: "Novo lead", value: 1500, expectedCloseDate: "2026-01-01" },
    responses: [{ status: 201, description: "Lead criado", body: { id: "cm...", title: "Novo lead" } }, BAD_REQUEST, UNAUTHORIZED],
  },
  {
    kind: "endpoint",
    id: "leads-get",
    title: "Detalhe do lead",
    method: "GET",
    path: "/api/leads/{id}",
    auth: "session",
    description: "Retorna o lead com relações e tags.",
    pathParams: idParam("do lead"),
    responses: [{ status: 200, description: "Lead", body: { id: "cm...", title: "Lead" } }, UNAUTHORIZED, NOT_FOUND],
  },
  {
    kind: "endpoint",
    id: "leads-update",
    title: "Atualizar lead",
    method: "PUT",
    path: "/api/leads/{id}",
    auth: "session",
    description: "Atualiza um lead. Todos os campos são opcionais.",
    pathParams: idParam("do lead"),
    bodyParams: [...leadBody.map((p) => ({ ...p, required: false })), s("ownerId"), s("lostReason")],
    bodyExample: { title: "Título atualizado", value: 2000 },
    responses: [{ status: 200, description: "Lead atualizado", body: { id: "cm...", title: "Título atualizado" } }, BAD_REQUEST, UNAUTHORIZED],
  },
  {
    kind: "endpoint",
    id: "leads-delete",
    title: "Remover lead",
    method: "DELETE",
    path: "/api/leads/{id}",
    auth: "session",
    description: "Remove um lead.",
    pathParams: idParam("do lead"),
    responses: [OK_DELETE, UNAUTHORIZED],
  },
  {
    kind: "endpoint",
    id: "leads-stage",
    title: "Mover lead de etapa",
    method: "PATCH",
    path: "/api/leads/{id}/stage",
    auth: "session",
    description: "Move o lead para outra etapa do pipeline (usado no drag-and-drop do Kanban).",
    pathParams: idParam("do lead"),
    bodyParams: [s("stageId", "ID da nova etapa", true)],
    bodyExample: { stageId: "cm..." },
    responses: [{ status: 200, description: "Lead movido", body: { id: "cm...", stageId: "cm..." } }, BAD_REQUEST, UNAUTHORIZED],
  },
];

// ─── Produtos ────────────────────────────────────────────────────────────────

const productBody: Param[] = [s("name", undefined, true), s("sku"), s("description"), n("price"), n("quantity")];
const productEntries: Entry[] = [
  {
    kind: "endpoint",
    id: "products-list",
    title: "Listar produtos",
    method: "GET",
    path: "/api/products",
    auth: "session",
    description: "Lista produtos. Aceita busca por nome e SKU.",
    queryParams: [s("search", "Busca em name e sku")],
    responses: [{ status: 200, description: "Lista de produtos", body: [{ id: "cm...", name: "Produto", price: 10 }] }, UNAUTHORIZED],
  },
  {
    kind: "endpoint",
    id: "products-create",
    title: "Criar produto",
    method: "POST",
    path: "/api/products",
    auth: "session",
    description: "Cria um produto.",
    bodyParams: productBody,
    bodyExample: { name: "Plano Pro", sku: "PRO-001", price: 199.9, quantity: 100 },
    responses: [{ status: 201, description: "Produto criado", body: { id: "cm...", name: "Plano Pro" } }, BAD_REQUEST, UNAUTHORIZED],
  },
  {
    kind: "endpoint",
    id: "products-get",
    title: "Detalhe do produto",
    method: "GET",
    path: "/api/products/{id}",
    auth: "session",
    description: "Retorna um produto.",
    pathParams: idParam("do produto"),
    responses: [{ status: 200, description: "Produto", body: { id: "cm...", name: "Produto" } }, UNAUTHORIZED, NOT_FOUND],
  },
  {
    kind: "endpoint",
    id: "products-update",
    title: "Atualizar produto",
    method: "PUT",
    path: "/api/products/{id}",
    auth: "session",
    description: "Atualiza um produto.",
    pathParams: idParam("do produto"),
    bodyParams: productBody.map((p) => ({ ...p, required: false })),
    bodyExample: { price: 249.9 },
    responses: [{ status: 200, description: "Produto atualizado", body: { id: "cm...", price: 249.9 } }, BAD_REQUEST, UNAUTHORIZED],
  },
  {
    kind: "endpoint",
    id: "products-delete",
    title: "Remover produto",
    method: "DELETE",
    path: "/api/products/{id}",
    auth: "session",
    description: "Remove um produto.",
    pathParams: idParam("do produto"),
    responses: [OK_DELETE, UNAUTHORIZED],
  },
];

// ─── Contatos / Atividades ───────────────────────────────────────────────────

const personEntries = crud(
  {
    slug: "persons",
    singular: "uma pessoa",
    plural: "pessoas",
    basePath: "/api/contacts/persons",
    listNote: "Inclui a organização.",
    createBody: [s("firstName", undefined, true), s("lastName"), s("email"), s("phone"), s("jobTitle"), s("organizationId")],
    createExample: { firstName: "Maria", lastName: "Souza", email: "maria@empresa.com" },
  },
  false
);

const orgEntries = crud(
  {
    slug: "orgs",
    singular: "uma organização",
    plural: "organizações",
    basePath: "/api/contacts/organizations",
    createBody: [s("name", undefined, true), s("email"), s("phone"), s("website"), s("address"), s("city"), s("state"), s("country")],
    createExample: { name: "Empresa XYZ", email: "contato@xyz.com", city: "São Paulo" },
  },
  false
);

const activityEntries = crud(
  {
    slug: "activities",
    singular: "uma atividade",
    plural: "atividades",
    basePath: "/api/activities",
    listNote: "Inclui o responsável (owner).",
    createBody: [
      s("title", undefined, true),
      s("type", "CALL | MEETING | TASK | NOTE | EMAIL"),
      s("comment"),
      s("location"),
      s("scheduledAt", "ISO 8601"),
      s("endsAt", "ISO 8601"),
      s("leadId"),
      s("personId"),
    ],
    createExample: { title: "Reunião de proposta", type: "MEETING", scheduledAt: "2026-01-01T10:00:00Z" },
  },
  false
);

// ─── Configurações ───────────────────────────────────────────────────────────

const nameOnly = (): Param[] => [s("name", undefined, true)];

const settingsGroups: Group[] = [
  {
    id: "settings-users",
    title: "Configurações · Usuários",
    entries: crud({
      slug: "users",
      singular: "um usuário",
      plural: "usuários",
      basePath: "/api/settings/users",
      listNote: "Inclui a role.",
      createBody: [
        s("name", undefined, true),
        s("email", "Único", true),
        s("password", "Mínimo 6 caracteres (armazenada com bcrypt)"),
        s("roleId"),
        { name: "status", type: "boolean" },
      ],
      createExample: { name: "Ana", email: "ana@empresa.com", password: "senha123", status: true },
      extraCreateResponses: [{ status: 409, description: "E-mail já cadastrado", body: { error: "Email já cadastrado" } }],
    }),
  },
  {
    id: "settings-roles",
    title: "Configurações · Roles",
    entries: crud({
      slug: "roles",
      singular: "uma role",
      plural: "roles",
      basePath: "/api/settings/roles",
      listNote: "Inclui a contagem de usuários.",
      createBody: [...nameOnly(), s("description"), { name: "permissions", type: "string[]" }],
      createExample: { name: "Vendedor", description: "Acesso a leads", permissions: [] },
    }),
  },
  {
    id: "settings-groups",
    title: "Configurações · Grupos",
    entries: crud({
      slug: "groups",
      singular: "um grupo",
      plural: "grupos",
      basePath: "/api/settings/groups",
      listNote: "Inclui a contagem de usuários.",
      createBody: [...nameOnly(), s("description")],
      createExample: { name: "Equipe Sul", description: "Vendas região sul" },
    }),
  },
  {
    id: "settings-pipelines",
    title: "Configurações · Pipelines",
    entries: crud({
      slug: "pipelines",
      singular: "um pipeline",
      plural: "pipelines",
      basePath: "/api/settings/pipelines",
      listNote: "Inclui as etapas (stages) e a contagem de leads.",
      createBody: [
        ...nameOnly(),
        { name: "isDefault", type: "boolean", description: "Marcar como padrão desmarca o anterior" },
        n("rottenDays"),
        {
          name: "stages",
          type: "object[]",
          description: "{ name, code, probability, sortOrder }. No PUT, substitui as etapas sem leads.",
        },
      ],
      createExample: {
        name: "Vendas",
        isDefault: false,
        rottenDays: 30,
        stages: [{ name: "Novo", code: "new", probability: 10, sortOrder: 0 }],
      },
    }),
  },
  {
    id: "settings-sources",
    title: "Configurações · Origens de lead",
    entries: crud({
      slug: "sources",
      singular: "uma origem",
      plural: "origens de lead",
      basePath: "/api/settings/lead-sources",
      createBody: nameOnly(),
      createExample: { name: "Website" },
    }),
  },
  {
    id: "settings-types",
    title: "Configurações · Tipos de lead",
    entries: crud({
      slug: "types",
      singular: "um tipo",
      plural: "tipos de lead",
      basePath: "/api/settings/lead-types",
      createBody: nameOnly(),
      createExample: { name: "Novo negócio" },
    }),
  },
  {
    id: "settings-tags",
    title: "Configurações · Tags",
    entries: crud({
      slug: "tags",
      singular: "uma tag",
      plural: "tags",
      basePath: "/api/settings/tags",
      createBody: [...nameOnly(), s("color", "Hex, ex.: #6366f1")],
      createExample: { name: "VIP", color: "#6366f1" },
    }),
  },
  {
    id: "settings-webhooks",
    title: "Configurações · Webhooks de saída",
    entries: crud({
      slug: "webhooks",
      singular: "um webhook de saída",
      plural: "webhooks de saída",
      basePath: "/api/settings/webhooks",
      listNote: "São webhooks que o CRM dispara para fora.",
      createBody: [...nameOnly(), s("url", "URL válida", true), s("event", undefined, true), s("method", "Padrão: POST"), { name: "active", type: "boolean" }],
      createExample: { name: "Notificar N8N", url: "https://n8n.exemplo.com/webhook/x", event: "lead.created", method: "POST", active: true },
    }),
  },
];

export const docsGroups: Group[] = [
  { id: "start", title: "Começando", entries: [intro, authGuide] },
  { id: "webhook", title: "Webhook de integração", entries: webhookEntries },
  { id: "leads", title: "Leads", entries: leadEntries },
  { id: "persons", title: "Contatos · Pessoas", entries: personEntries },
  { id: "orgs", title: "Contatos · Organizações", entries: orgEntries },
  { id: "products", title: "Produtos", entries: productEntries },
  { id: "activities", title: "Atividades", entries: activityEntries },
  ...settingsGroups,
];

export const allEntries: Entry[] = docsGroups.flatMap((g) => g.entries);

export function findEntry(id: string): Entry | undefined {
  return allEntries.find((e) => e.id === id);
}
