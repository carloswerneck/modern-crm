"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Zap, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface Webhook {
  id: string;
  name: string;
  url: string;
  event: string;
  method: string;
  active: boolean;
  createdAt: string;
}

const EVENTS = [
  { value: "lead.created", label: "Lead criado" },
  { value: "lead.updated", label: "Lead atualizado" },
  { value: "lead.deleted", label: "Lead excluído" },
  { value: "lead.stage_changed", label: "Lead mudou de etapa" },
  { value: "person.created", label: "Pessoa criada" },
  { value: "person.updated", label: "Pessoa atualizada" },
  { value: "organization.created", label: "Organização criada" },
  { value: "activity.created", label: "Atividade criada" },
];

const METHODS = ["POST", "PUT", "PATCH"];

export default function SettingsWebhooksPage() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", event: "lead.created", method: "POST", active: true });

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/settings/webhooks");
    if (res.ok) setWebhooks(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() {
    setForm({ name: "", url: "", event: "lead.created", method: "POST", active: true });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(webhook: Webhook) {
    setForm({ name: webhook.name, url: webhook.url, event: webhook.event, method: webhook.method, active: webhook.active });
    setEditingId(webhook.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const url = editingId ? `/api/settings/webhooks/${editingId}` : "/api/settings/webhooks";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast({ title: editingId ? "Webhook atualizado!" : "Webhook criado!" });
      resetForm();
      loadData();
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este webhook?")) return;
    const res = await fetch(`/api/settings/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Webhook excluído!" });
      loadData();
    } else {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  }

  async function handleToggle(webhook: Webhook) {
    const res = await fetch(`/api/settings/webhooks/${webhook.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !webhook.active }),
    });
    if (res.ok) {
      toast({ title: webhook.active ? "Webhook desativado" : "Webhook ativado" });
      loadData();
    }
  }

  function getEventLabel(event: string) {
    return EVENTS.find((e) => e.value === event)?.label || event;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
            <p className="text-muted-foreground">Integrações com sistemas externos</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Novo Webhook
        </Button>
      </div>

      {showForm && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? "Editar Webhook" : "Novo Webhook"}</h2>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Notificar Slack" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL *</Label>
                  <Input id="url" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event">Evento *</Label>
                  <select
                    id="event"
                    value={form.event}
                    onChange={(e) => setForm({ ...form, event: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {EVENTS.map((ev) => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Método HTTP</Label>
                  <select
                    id="method"
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded" />
                <Label htmlFor="active">Ativo</Label>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Salvar" : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nome</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">URL</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Evento</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Método</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Criado em</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
                ) : webhooks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Zap className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum webhook encontrado</p>
                    </td>
                  </tr>
                ) : (
                  webhooks.map((webhook) => (
                    <tr key={webhook.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm font-medium">{webhook.name}</td>
                      <td className="p-4 text-sm text-muted-foreground font-mono text-xs max-w-[200px] truncate">{webhook.url}</td>
                      <td className="p-4"><Badge variant="secondary" className="text-xs">{getEventLabel(webhook.event)}</Badge></td>
                      <td className="p-4"><Badge variant="secondary" className="text-xs">{webhook.method}</Badge></td>
                      <td className="p-4">
                        <button onClick={() => handleToggle(webhook)} className="cursor-pointer">
                          <Badge variant={webhook.active ? "default" : "secondary"}>
                            {webhook.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </button>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(webhook.createdAt)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(webhook)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(webhook.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
