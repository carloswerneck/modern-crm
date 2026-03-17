"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Target, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

interface LeadType {
  id: string;
  name: string;
  _count: { leads: number };
  createdAt: string;
}

export default function SettingsLeadTypesPage() {
  const { toast } = useToast();
  const [types, setTypes] = useState<LeadType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "" });

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/settings/lead-types");
    if (res.ok) setTypes(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function resetForm() {
    setForm({ name: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(type: LeadType) {
    setForm({ name: type.name });
    setEditingId(type.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const url = editingId ? `/api/settings/lead-types/${editingId}` : "/api/settings/lead-types";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast({ title: editingId ? "Tipo atualizado!" : "Tipo criado!" });
      resetForm();
      loadData();
    } else {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este tipo?")) return;
    const res = await fetch(`/api/settings/lead-types/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Tipo excluído!" });
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
            <h1 className="text-2xl font-bold tracking-tight">Tipos de Lead</h1>
            <p className="text-muted-foreground">Categorias de leads</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Novo Tipo
        </Button>
      </div>

      {showForm && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingId ? "Editar Tipo" : "Novo Tipo"}</h2>
              <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ name: e.target.value })} placeholder="Ex: Novo Negócio, Renovação, Upsell" required />
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
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Leads</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Criado em</th>
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></td></tr>
                ) : types.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-muted-foreground">
                      <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum tipo encontrado</p>
                    </td>
                  </tr>
                ) : (
                  types.map((type) => (
                    <tr key={type.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 text-sm font-medium">{type.name}</td>
                      <td className="p-4"><Badge variant="secondary">{type._count.leads}</Badge></td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(type.createdAt)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEdit(type)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(type.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
