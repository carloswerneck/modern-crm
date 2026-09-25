"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  docsGroups,
  findEntry,
  type Endpoint,
  type Entry,
  type Method,
  type Param,
} from "@/lib/api-docs";

// ─── Helpers visuais ─────────────────────────────────────────────────────────

const METHOD_STYLE: Record<Method, string> = {
  GET: "bg-emerald-500/15 text-emerald-400",
  POST: "bg-blue-500/20 text-blue-400",
  PUT: "bg-amber-500/15 text-amber-400",
  PATCH: "bg-purple-500/15 text-purple-400",
  DELETE: "bg-red-500/15 text-red-400",
};
const METHOD_LABEL: Record<Method, string> = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DEL",
};

function MethodBadge({ method, small }: { method: Method; small?: boolean }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 font-mono font-semibold ${
        small ? "text-[10px]" : "text-xs"
      } ${METHOD_STYLE[method]}`}
    >
      {METHOD_LABEL[method]}
    </span>
  );
}

function statusColor(status: number) {
  if (status >= 500) return "bg-red-500";
  if (status >= 400) return "bg-amber-500";
  if (status >= 200 && status < 300) return "bg-emerald-500";
  return "bg-slate-400";
}

function highlightJson(src: string) {
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let cls = "text-amber-300";
      if (/^"/.test(m)) cls = /:$/.test(m) ? "text-sky-300" : "text-emerald-300";
      else if (/true|false|null/.test(m)) cls = "text-purple-300";
      return `<span class="${cls}">${m}</span>`;
    }
  );
}

function Json({ value }: { value: unknown }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <pre
      className="overflow-x-auto whitespace-pre font-mono text-[13px] leading-relaxed text-slate-300"
      dangerouslySetInnerHTML={{ __html: highlightJson(text ?? "") }}
    />
  );
}

// ─── Geração de código ───────────────────────────────────────────────────────

type Lang = "shell" | "node" | "python" | "php";
const LANGS: { id: Lang; label: string }[] = [
  { id: "shell", label: "Shell" },
  { id: "node", label: "Node" },
  { id: "python", label: "Python" },
  { id: "php", label: "PHP" },
];

interface BuiltRequest {
  method: Method;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

function buildRequest(
  ep: Endpoint,
  base: string,
  pathValues: Record<string, string>,
  queryValues: Record<string, string>,
  bodyText: string,
  apiKey: string
): BuiltRequest {
  let path = ep.path;
  for (const p of ep.pathParams ?? []) {
    path = path.replace(`{${p.name}}`, encodeURIComponent(pathValues[p.name] || `{${p.name}}`));
  }
  const qs = Object.entries(queryValues)
    .filter(([, v]) => v)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const headers: Record<string, string> = { accept: "application/json" };
  const hasBody = ep.bodyExample !== undefined && ep.method !== "GET" && ep.method !== "DELETE";
  if (hasBody) headers["content-type"] = "application/json";
  if (ep.auth === "apikey") headers["x-api-key"] = apiKey || "SUA_CHAVE";
  return {
    method: ep.method,
    url: `${base}${path}${qs ? `?${qs}` : ""}`,
    headers,
    body: hasBody ? bodyText : undefined,
  };
}

function compactBody(body: string) {
  try {
    return JSON.stringify(JSON.parse(body));
  } catch {
    return body;
  }
}

function toCode(lang: Lang, r: BuiltRequest, ep: Endpoint): string {
  const hs = Object.entries(r.headers);
  const body = r.body ? compactBody(r.body) : undefined;
  const sessionNote = ep.auth === "session";

  if (lang === "shell") {
    const lines = [`curl --request ${r.method} \\`, `     --url '${r.url}' \\`];
    hs.forEach(([k, v]) => lines.push(`     --header '${k}: ${v}' \\`));
    if (sessionNote) lines.push(`     --cookie 'authjs.session-token=SEU_COOKIE' \\`);
    if (body) lines.push(`     --data '${body.replace(/'/g, "'\\''")}'`);
    else lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, "");
    return lines.join("\n");
  }
  if (lang === "node") {
    const h = hs.map(([k, v]) => `    '${k}': '${v}'`).join(",\n");
    return [
      `const res = await fetch('${r.url}', {`,
      `  method: '${r.method}',`,
      `  headers: {\n${h}\n  },`,
      ...(body ? [`  body: JSON.stringify(${body}),`] : []),
      `});`,
      `const data = await res.json();`,
      `console.log(res.status, data);`,
    ].join("\n");
  }
  if (lang === "python") {
    const h = hs.map(([k, v]) => `    "${k}": "${v}"`).join(",\n");
    return [
      `import requests`,
      ``,
      `res = requests.request(`,
      `    "${r.method}",`,
      `    "${r.url}",`,
      `    headers={\n${h}\n    },`,
      ...(body ? [`    json=${body},`] : []),
      `)`,
      `print(res.status_code, res.json())`,
    ].join("\n");
  }
  const h = hs.map(([k, v]) => `    '${k}: ${v}'`).join(",\n");
  return [
    `<?php`,
    `$ch = curl_init('${r.url}');`,
    `curl_setopt_array($ch, [`,
    `  CURLOPT_CUSTOMREQUEST => '${r.method}',`,
    `  CURLOPT_RETURNTRANSFER => true,`,
    `  CURLOPT_HTTPHEADER => [\n${h}\n  ],`,
    ...(body ? [`  CURLOPT_POSTFIELDS => '${body.replace(/'/g, "\\'")}',`] : []),
    `]);`,
    `$response = curl_exec($ch);`,
    `echo curl_getinfo($ch, CURLINFO_HTTP_CODE), "\\n", $response;`,
  ].join("\n");
}

// ─── Blocos da coluna central ────────────────────────────────────────────────

const FIELD_CLASS =
  "w-full rounded-md border border-white/10 bg-[#11141b] px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

function ParamList({
  title,
  params,
  getValue,
  onChange,
}: {
  title: string;
  params?: Param[];
  getValue: (p: Param) => string;
  onChange: (p: Param, value: string) => void;
}) {
  if (!params?.length) return null;
  return (
    <section className="mt-10">
      <h3 className="mb-3 text-lg font-semibold text-white">{title}</h3>
      <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-white/[0.02]">
        {params.map((p) => (
          <div key={p.name} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-white">{p.name}</span>
                <span className="text-xs text-slate-400">{p.type}</span>
                {p.required && <span className="text-xs font-medium text-red-400">required</span>}
              </div>
              {p.description && <p className="mt-1 text-sm text-slate-400">{p.description}</p>}
            </div>
            {!p.noInput && (
              <div className="w-full shrink-0 sm:w-56">
                {p.type === "boolean" ? (
                  <select
                    value={getValue(p)}
                    onChange={(e) => onChange(p, e.target.value)}
                    className={FIELD_CLASS}
                  >
                    <option value="">—</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                  </select>
                ) : (
                  <input
                    value={getValue(p)}
                    onChange={(e) => onChange(p, e.target.value)}
                    disabled={p.fixed}
                    placeholder={p.name.split(".").pop()}
                    spellCheck={false}
                    autoComplete="off"
                    aria-label={`Valor de ${p.name}`}
                    className={FIELD_CLASS}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// Leitura/escrita de campos (com notação "a.b") no JSON do body.
function getBodyField(obj: unknown, name: string): string {
  let cur: unknown = obj;
  for (const key of name.split(".")) {
    if (cur === null || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[key];
  }
  if (cur === undefined || cur === null) return "";
  return typeof cur === "string" ? cur : JSON.stringify(cur);
}

function coerceValue(type: string, raw: string): unknown {
  if (raw === "") return undefined;
  if (type === "number") return /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
  if (type === "boolean") return raw === "true";
  if (type.includes("[]") || type === "object") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function setBodyField(obj: Record<string, unknown>, p: Param, raw: string): Record<string, unknown> {
  const next = structuredClone(obj);
  const keys = p.name.split(".");
  let cur = next;
  for (const key of keys.slice(0, -1)) {
    const child = cur[key];
    if (child === null || typeof child !== "object" || Array.isArray(child)) cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
  const last = keys[keys.length - 1];
  const value = coerceValue(p.type, raw);
  if (value === undefined) delete cur[last];
  else cur[last] = value;
  return next;
}

function AuthNote({ ep }: { ep: Endpoint }) {
  if (ep.auth === "apikey") {
    return (
      <div className="mt-6 rounded-lg border-l-4 border-blue-500 bg-blue-500/10 px-4 py-3 text-sm text-slate-200">
        Requer a API key no header <code className="rounded bg-white/10 px-1">x-api-key</code> ou{" "}
        <code className="rounded bg-white/10 px-1">Authorization: Bearer</code>.
      </div>
    );
  }
  if (ep.auth === "session") {
    return (
      <div className="mt-6 rounded-lg border-l-4 border-blue-500 bg-blue-500/10 px-4 py-3 text-sm text-slate-200">
        Requer sessão autenticada (cookie do NextAuth). Faça login em{" "}
        <a href="/login" className="text-blue-400 underline">
          /login
        </a>{" "}
        no mesmo navegador para usar o &quot;Try It&quot;.
      </div>
    );
  }
  return null;
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function DocsClient() {
  const [activeId, setActiveId] = useState("intro");
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState<Lang>("shell");
  const [apiKey, setApiKey] = useState("");
  const [base, setBase] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: number; ms: number; body: string } | null>(null);
  const [exampleIdx, setExampleIdx] = useState(0);

  const entry: Entry = findEntry(activeId) ?? docsGroups[0].entries[0];

  // origem + hash inicial
  useEffect(() => {
    setBase(window.location.origin);
    const fromHash = () => {
      const id = window.location.hash.replace("#", "");
      if (id && findEntry(id)) setActiveId(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  // reset do estado de "Try It" ao trocar de endpoint
  useEffect(() => {
    setPathValues({});
    setQueryValues({});
    setResult(null);
    setExampleIdx(0);
    setBodyText(
      entry.kind === "endpoint" && entry.bodyExample !== undefined
        ? JSON.stringify(entry.bodyExample, null, 2)
        : ""
    );
  }, [entry]);

  const select = useCallback((id: string) => {
    setActiveId(id);
    setNavOpen(false);
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0 });
  }, []);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docsGroups;
    return docsGroups
      .map((g) => ({
        ...g,
        entries: g.entries.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.kind === "endpoint" && e.path.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.entries.length > 0);
  }, [query]);

  // JSON do body como objeto, para preencher os campos de Body Params
  const bodyObj = useMemo<Record<string, unknown>>(() => {
    try {
      const v = JSON.parse(bodyText);
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch {
      return {};
    }
  }, [bodyText]);

  const request = useMemo(
    () =>
      entry.kind === "endpoint"
        ? buildRequest(entry, base || "https://seu-dominio.com", pathValues, queryValues, bodyText, apiKey)
        : null,
    [entry, base, pathValues, queryValues, bodyText, apiKey]
  );

  const tryIt = async () => {
    if (entry.kind !== "endpoint" || !request) return;
    setLoading(true);
    setResult(null);
    const started = performance.now();
    try {
      const res = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        credentials: "same-origin",
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
      setResult({ status: res.status, ms: Math.round(performance.now() - started), body: pretty });
    } catch (err) {
      setResult({ status: 0, ms: Math.round(performance.now() - started), body: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (entry.kind !== "endpoint" || !request) return;
    try {
      await navigator.clipboard.writeText(toCode(lang, request, entry));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const missingPathParam =
    entry.kind === "endpoint" && (entry.pathParams ?? []).some((p) => !pathValues[p.name]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-300">
      {/* Topo */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0d12]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4">
          <button
            className="rounded p-2 text-slate-300 hover:bg-white/10 lg:hidden"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            ☰
          </button>
          <a href="/docs" className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-sm">
              C
            </span>
            Modern CRM <span className="font-normal text-slate-400">API</span>
          </a>
          <div className="mx-auto hidden w-full max-w-md md:block">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar endpoint..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <a href="/login" className="ml-auto text-sm text-slate-300 hover:text-white">
            Entrar no CRM
          </a>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        {/* Sidebar */}
        <aside
          className={`${
            navOpen ? "block" : "hidden"
          } fixed inset-x-0 bottom-0 top-16 z-20 overflow-y-auto bg-[#0b0d12] p-4 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-4rem)] lg:w-72 lg:shrink-0 lg:border-r lg:border-white/10`}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar..."
            className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none md:hidden"
          />
          {filteredGroups.map((g) => {
            const isOpen = query ? true : !collapsed[g.id];
            return (
              <div key={g.id} className="mb-4">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [g.id]: !c[g.id] }))}
                  className="flex w-full items-center justify-between px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300"
                >
                  {g.title}
                  <span>{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <ul className="mt-1 space-y-0.5">
                    {g.entries.map((e) => (
                      <li key={e.id}>
                        <button
                          onClick={() => select(e.id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm ${
                            e.id === entry.id
                              ? "bg-blue-500/15 text-blue-300"
                              : "text-slate-300 hover:bg-white/5"
                          }`}
                        >
                          <span className="truncate">{e.title}</span>
                          {e.kind === "endpoint" && <MethodBadge method={e.method} small />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {filteredGroups.length === 0 && (
            <p className="px-2 text-sm text-slate-500">Nenhum resultado.</p>
          )}
        </aside>

        {/* Conteúdo */}
        {entry.kind === "guide" ? (
          <main className="min-w-0 flex-1 px-6 py-10 lg:px-12">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-bold text-white">{entry.title}</h1>
              <p className="mt-3 text-lg text-slate-400">{entry.description}</p>
              {entry.sections.map((s) => (
                <section key={s.heading} className="mt-10">
                  <h2 className="mb-3 text-xl font-semibold text-white">{s.heading}</h2>
                  {s.text && <p className="leading-relaxed text-slate-300">{s.text}</p>}
                  {s.code && (
                    <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-[#11141b] p-4 font-mono text-[13px] text-slate-200">
                      {s.code.replace("{{BASE_URL}}", base || "https://seu-dominio.com")}
                    </pre>
                  )}
                </section>
              ))}
            </div>
          </main>
        ) : (
          <>
            <main className="min-w-0 flex-1 px-6 py-10 lg:px-12">
              <div className="max-w-3xl">
                <h1 className="text-4xl font-bold text-white">{entry.title}</h1>
                <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                  <MethodBadge method={entry.method} />
                  <code className="break-all font-mono text-sm text-slate-200">{entry.path}</code>
                </div>
                <p className="mt-5 text-lg leading-relaxed text-slate-300">{entry.description}</p>
                <AuthNote ep={entry} />

                <ParamList
                  title="Path Params"
                  params={entry.pathParams}
                  getValue={(p) => pathValues[p.name] ?? ""}
                  onChange={(p, v) => setPathValues((s) => ({ ...s, [p.name]: v }))}
                />
                <ParamList
                  title="Query Params"
                  params={entry.queryParams}
                  getValue={(p) => queryValues[p.name] ?? ""}
                  onChange={(p, v) => setQueryValues((s) => ({ ...s, [p.name]: v }))}
                />
                <ParamList
                  title="Body Params"
                  params={entry.bodyParams}
                  getValue={(p) => getBodyField(bodyObj, p.name)}
                  onChange={(p, v) => setBodyText(JSON.stringify(setBodyField(bodyObj, p, v), null, 2))}
                />

                <section className="mt-10">
                  <h3 className="mb-3 text-lg font-semibold text-white">Responses</h3>
                  <div className="space-y-3">
                    {entry.responses.map((r, i) => (
                      <div key={i} className="overflow-hidden rounded-lg border border-white/10">
                        <div className="flex items-center gap-2 bg-white/[0.04] px-4 py-2 text-sm">
                          <span className={`h-2 w-2 rounded-full ${statusColor(r.status)}`} />
                          <span className="font-mono font-semibold text-white">{r.status}</span>
                          <span className="text-slate-400">{r.description}</span>
                        </div>
                        {r.body !== undefined && (
                          <div className="bg-[#11141b] p-4">
                            <Json value={r.body} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </main>

            {/* Coluna direita */}
            <aside className="hidden w-[440px] shrink-0 space-y-4 px-4 py-10 xl:block">
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] space-y-4 overflow-y-auto pr-1">
                {/* Credenciais */}
                {entry.auth !== "none" && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Credentials
                      <span className="text-slate-300">
                        {entry.auth === "apikey" ? "API KEY" : "SESSÃO"}
                      </span>
                    </div>
                    {entry.auth === "apikey" ? (
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="CRM_API_KEY"
                        autoComplete="off"
                        className="w-full rounded-md border border-white/10 bg-[#11141b] px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <p className="text-sm text-slate-400">
                        Usa o cookie do seu login atual neste navegador.
                      </p>
                    )}
                  </div>
                )}

                {/* Body editável (sincronizado com os campos de Body Params) */}
                {entry.bodyExample !== undefined && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Body
                    </div>
                    <textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      spellCheck={false}
                      rows={Math.min(14, Math.max(4, bodyText.split("\n").length))}
                      className="w-full resize-y rounded-md border border-white/10 bg-[#11141b] p-3 font-mono text-[13px] text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Request */}
                {request && (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-[#11141b]">
                    <div className="flex items-center gap-1 border-b border-white/10 px-3 pt-2">
                      {LANGS.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setLang(l.id)}
                          className={`rounded-t px-3 py-2 text-sm ${
                            lang === l.id
                              ? "border-b-2 border-blue-500 text-white"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                    <pre className="max-h-72 overflow-auto p-4 font-mono text-[12.5px] leading-relaxed text-slate-300">
                      {toCode(lang, request, entry)}
                    </pre>
                    <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
                      <button
                        onClick={copy}
                        className="rounded px-2 py-1 text-sm text-slate-400 hover:bg-white/10 hover:text-white"
                      >
                        {copied ? "Copiado ✓" : "Copiar"}
                      </button>
                      <button
                        onClick={tryIt}
                        disabled={loading || missingPathParam}
                        title={missingPathParam ? "Preencha os path params" : undefined}
                        className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {loading ? "Enviando..." : "Try It!"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Resposta */}
                <div className="overflow-hidden rounded-xl border border-white/10 bg-[#11141b]">
                  <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Response
                    {result && <span className="normal-case text-slate-500">{result.ms} ms</span>}
                  </div>
                  <div className="p-4">
                    {result ? (
                      <>
                        <div className="mb-3 inline-flex items-center gap-2 rounded bg-white/5 px-2 py-1 font-mono text-sm text-white">
                          <span className={`h-2 w-2 rounded-full ${statusColor(result.status)}`} />
                          {result.status || "erro de rede"}
                        </div>
                        <div className="max-h-80 overflow-auto">
                          <Json value={result.body} />
                        </div>
                      </>
                    ) : entry.responses.length > 0 ? (
                      <>
                        <p className="mb-3 text-sm text-slate-400">
                          Clique em <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white">Try It!</span>{" "}
                          para enviar uma requisição, ou veja um exemplo:
                        </p>
                        <div className="mb-3 flex flex-wrap gap-2">
                          {entry.responses.map((r, i) => (
                            <button
                              key={i}
                              onClick={() => setExampleIdx(i)}
                              className={`inline-flex items-center gap-2 rounded px-2 py-1 font-mono text-sm ${
                                exampleIdx === i ? "bg-white/15 text-white" : "bg-white/5 text-slate-400"
                              }`}
                            >
                              <span className={`h-2 w-2 rounded-full ${statusColor(r.status)}`} />
                              {r.status}
                            </button>
                          ))}
                        </div>
                        {entry.responses[exampleIdx]?.body !== undefined && (
                          <Json value={entry.responses[exampleIdx].body} />
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
