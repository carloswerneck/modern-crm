"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, GitBranch, X, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface Stage {
  id: string;
  name: string;
  code: string;
  probability: number;
  sortOrder: number;
}

interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  rottenDays: number;
  stages: Stage[];
  _count: { leads: number };
  createdAt: string;
}

interface StageForm {
  name: string;
  code: string;
  probability: number;
}

export default function SettingsPipelinesPage() {
  const { toast } = useToast();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", isDefault: false, rottenDays: 30 });
  const [stages, setStages] = useState<StageForm[]>([]);

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/settings/pipelines");
    if (res.ok) setPipelines(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() {
    setForm({ name: "", isDefault: false, rottenDays: 30 });
    setStages([]);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(pipeline: Pipeline) {
    setForm({ name: pipeline.name, isDefault: pipeline.isDefault, rottenDays: pipeline.rottenDays });
    setStages(pipeline.stages.map((s) => ({ name: s.name, code: s.code, probability: s.probability })));
    setEditingId(pipeline.id);
    setShowForm(true);
  }

  function addStage() {
    setStages([...stages, { name: "", code: "", probability: 0 }]);
  }

  function updateStage(index: number, field: keyof StageForm, value: string | number) {
    const updated = [...stages];
    updated[index] = { ...updated[index], [field]: value };
    setStages(updated);
  }

  function removeStage(index: number) {
    setStages(stages.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const url = editingId ? `/api/settings/pipelines/${editingId}` : "/api/settings/pipelines";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        isDefault: form.isDefault,
        rottenDays: form.rottenDays,
        stages: stages.filter((s) => s.name && s.code).map((s, i) => ({ ...s, sortOrder: i })),
      }),
    });

    if (res.ok) {
      toast({ title: editingId ? "Pipeline atualizado!" : "Pipeline criado!" });
      resetForm();
      loadData();
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este pipeline?")) return;
    const res = await fetch(`/api/settings/pipelines/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Pipeline excluído!" });
      loadData();
    } else {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pipelines</h1>
            <p className="text-muted-foreground">Configure etapas do funil de vendas</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Novo Pipeline
        </Button>
      </div>

      {showForm && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? "Editar Pipeline" : "Novo Pipeline"}</h2>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Vendas" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rottenDays">Dias para Estagnação</Label>
                  <Input id="rottenDays" type="number" value={form.rottenDays} onChange={(e) => setForm({ ...form, rottenDays: parseInt(e.target.value) || 30 })} />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} className="rounded" />
                    <Label htmlFor="isDefault">Pipeline padrão</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Etapas</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addStage}>
                    <Plus className="mr-1 h-3 w-3" />Etapa
                  </Button>
                </div>
                {stages.map((stage, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      placeholder="Nome da etapa"
                      value={stage.name}
                      onChange={(e) => updateStage(index, "name", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Código"
                      value={stage.code}
                      onChange={(e) => updateStage(index, "code", e.target.value)}
                      className="w-32"
                    />
                    <Input
                      type="number"
                      placeholder="%"
                      value={stage.probability}
                      onChange={(e) => updateStage(index, "probability", parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeStage(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {stages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma etapa adicionada. Clique em &quot;Etapa&quot; para adicionar.</p>
                )}
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
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Etapas</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Leads</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Padrão</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Criado em</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
                ) : pipelines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum pipeline encontrado</p>
                    </td>
                  </tr>
                ) : (
                  pipelines.map((pipeline) => (
                    <tr key={pipeline.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm font-medium">{pipeline.name}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {pipeline.stages.map((s) => (
                            <Badge key={s.id} variant="secondary" className="text-xs">{s.name} ({s.probability}%)</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4"><Badge variant="secondary">{pipeline._count.leads}</Badge></td>
                      <td className="p-4">
                        {pipeline.isDefault ? <Badge>Sim</Badge> : <span className="text-muted-foreground text-sm">Não</span>}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(pipeline.createdAt)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(pipeline)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(pipeline.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
