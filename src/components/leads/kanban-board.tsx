"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  X,
  GripVertical,
  Building2,
  User,
  Loader2,
  ChevronDown,
  DollarSign,
  Calendar,
  UserCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tag {
  tag: { id: string; name: string; color: string };
}

interface LeadCard {
  id: string;
  title: string;
  value: number | null;
  stageId: string | null;
  person: { firstName: string; lastName: string | null } | null;
  organization: { name: string } | null;
  owner: { name: string; image: string | null } | null;
  tags: Tag[];
  createdAt?: string;
}

interface Stage {
  id: string;
  name: string;
  code: string;
  probability: number;
  sortOrder: number;
  pipelineId: string;
}

interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Stage[];
}

interface KanbanBoardProps {
  pipelines: Pipeline[];
  leads: LeadCard[];
  initialPipelineId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrencyLocal(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getProbabilityColor(probability: number) {
  if (probability >= 75) return "bg-green-500";
  if (probability >= 50) return "bg-yellow-500";
  if (probability >= 25) return "bg-orange-500";
  return "bg-red-500";
}

function getProbabilityBgColor(probability: number) {
  if (probability >= 75) return "bg-green-50 border-green-200";
  if (probability >= 50) return "bg-yellow-50 border-yellow-200";
  if (probability >= 25) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

// ─── Quick Add Form ───────────────────────────────────────────────────────────

function QuickAddForm({
  stageId,
  pipelineId,
  onClose,
  onCreated,
}: {
  stageId: string;
  pipelineId: string;
  onClose: () => void;
  onCreated: (lead: LeadCard) => void;
}) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          value: value ? parseFloat(value) : undefined,
          stageId,
          pipelineId,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        // Fetch full lead with relations
        const fullRes = await fetch(`/api/leads/${created.id}`);
        const fullLead = await fullRes.json();
        onCreated(fullLead);
        toast({ title: "Lead criado com sucesso!" });
        onClose();
      } else {
        toast({ title: "Erro ao criar lead", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao criar lead", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-white rounded-lg border shadow-sm space-y-2">
      <Input
        placeholder="Titulo do lead..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        className="text-sm h-8"
      />
      <Input
        type="number"
        step="0.01"
        placeholder="Valor (R$)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="text-sm h-8"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || !title.trim()} className="h-7 text-xs">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Criar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
          <X className="h-3 w-3" />
        </Button>
      </div>
    </form>
  );
}

// ─── Lead Card Component ──────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `${days}d atrás`;
  if (days < 30) return `${Math.floor(days / 7)}sem atrás`;
  return `${Math.floor(days / 30)}m atrás`;
}

function LeadCardItem({
  lead,
  onDragStart,
}: {
  lead: LeadCard;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
}) {
  const personName = lead.person
    ? `${lead.person.firstName} ${lead.person.lastName || ""}`.trim()
    : null;

  return (
    <Link href={`/leads/${lead.id}`}>
      <Card
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(e, lead.id);
        }}
        className="p-0 border shadow-sm hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing bg-white group hover:border-primary/40 overflow-hidden"
      >
        {/* Color accent bar */}
        {lead.value && lead.value > 0 ? (
          <div className="h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
        ) : (
          <div className="h-1 bg-gradient-to-r from-slate-200 to-slate-300" />
        )}

        <div className="p-3.5 space-y-3">
          {/* Title + drag handle */}
          <div className="flex items-start gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-[13px] font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
              {lead.title}
            </p>
          </div>

          {/* Value badge */}
          {lead.value && lead.value > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-green-50 text-green-700 rounded-md px-2 py-1">
                <DollarSign className="h-3 w-3" />
                <span className="text-xs font-bold">{formatCurrencyLocal(lead.value)}</span>
              </div>
            </div>
          )}

          {/* Contact info */}
          {(personName || lead.organization) && (
            <div className="space-y-1.5">
              {personName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                    <User className="h-2.5 w-2.5" />
                  </div>
                  <span className="truncate font-medium">{personName}</span>
                </div>
              )}

              {lead.organization && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Building2 className="h-2.5 w-2.5" />
                  </div>
                  <span className="truncate">{lead.organization.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.tags.map((lt) => (
                <span
                  key={lt.tag.id}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                  style={{
                    backgroundColor: lt.tag.color + "15",
                    color: lt.tag.color,
                    borderColor: lt.tag.color + "30",
                  }}
                >
                  {lt.tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Footer: owner + time */}
          <div className="flex items-center justify-between pt-1 border-t border-dashed">
            {lead.owner ? (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                  {getInitials(lead.owner.name)}
                </div>
                <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                  {lead.owner.name}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground/50">
                <UserCircle className="h-3.5 w-3.5" />
                <span className="text-[10px]">Sem responsável</span>
              </div>
            )}
            {lead.createdAt && (
              <span className="text-[10px] text-muted-foreground/60">
                {timeAgo(lead.createdAt)}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── Column Component ─────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  pipelineId,
  dragOverStageId,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onLeadCreated,
}: {
  stage: Stage;
  leads: LeadCard[];
  pipelineId: string;
  dragOverStageId: string | null;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onLeadCreated: (lead: LeadCard) => void;
}) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
  const isDragOver = dragOverStageId === stage.id;

  return (
    <div
      className={`flex flex-col min-w-[300px] max-w-[340px] w-[320px] shrink-0 rounded-xl border transition-all duration-200 ${
        isDragOver ? "ring-2 ring-primary/50 bg-primary/5 border-primary/30 scale-[1.01]" : "bg-muted/20 border-transparent"
      }`}
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, stage.id)}
    >
      {/* Column Header */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${getProbabilityColor(stage.probability)} ring-2 ring-offset-1 ${getProbabilityColor(stage.probability)}/30`} />
            <h3 className="text-sm font-bold tracking-tight">{stage.name}</h3>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 rounded-full font-bold">
              {leads.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">
            {totalValue > 0 ? formatCurrencyLocal(totalValue) : "R$ 0,00"}
          </p>
          <p className="text-[10px] text-muted-foreground/60">{stage.probability}% prob.</p>
        </div>
        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={`h-full rounded-full ${getProbabilityColor(stage.probability)} transition-all`}
            style={{ width: `${stage.probability}%` }}
          />
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[100px]">
        {showQuickAdd && (
          <QuickAddForm
            stageId={stage.id}
            pipelineId={pipelineId}
            onClose={() => setShowQuickAdd(false)}
            onCreated={onLeadCreated}
          />
        )}

        {leads.map((lead) => (
          <LeadCardItem key={lead.id} lead={lead} onDragStart={onDragStart} />
        ))}

        {leads.length === 0 && !showQuickAdd && (
          <div className="text-center py-8 text-muted-foreground/50">
            <p className="text-xs">Nenhum lead</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pipeline Selector ────────────────────────────────────────────────────────

function PipelineSelector({
  pipelines,
  selectedId,
  onSelect,
}: {
  pipelines: Pipeline[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = pipelines.find((p) => p.id === selectedId);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setOpen(!open)}
      >
        {selected?.name || "Selecionar pipeline"}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-white border rounded-lg shadow-lg py-1 min-w-[200px]">
            {pipelines.map((pipeline) => (
              <button
                key={pipeline.id}
                onClick={() => {
                  onSelect(pipeline.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                  pipeline.id === selectedId ? "bg-muted font-medium" : ""
                }`}
              >
                {pipeline.name}
                {pipeline.isDefault && (
                  <span className="ml-2 text-xs text-muted-foreground">(padrão)</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export default function KanbanBoard({
  pipelines,
  leads: initialLeads,
  initialPipelineId,
}: KanbanBoardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const defaultPipeline =
    pipelines.find((p) => p.id === initialPipelineId) ||
    pipelines.find((p) => p.isDefault) ||
    pipelines[0];

  const [selectedPipelineId, setSelectedPipelineId] = useState(
    defaultPipeline?.id || ""
  );
  const [leads, setLeads] = useState<LeadCard[]>(initialLeads);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const draggedLeadId = useRef<string | null>(null);

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder) || [];

  const stageIds = new Set(stages.map((s) => s.id));
  const pipelineLeads = leads.filter(
    (l) => l.stageId && stageIds.has(l.stageId)
  );

  // Group leads by stage
  const leadsByStage: Record<string, LeadCard[]> = {};
  for (const stage of stages) {
    leadsByStage[stage.id] = [];
  }
  for (const lead of pipelineLeads) {
    if (lead.stageId && leadsByStage[lead.stageId]) {
      leadsByStage[lead.stageId].push(lead);
    }
  }

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    draggedLeadId.current = leadId;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
    // Add a slight delay for visual feedback
    const target = e.currentTarget as HTMLElement;
    setTimeout(() => {
      target.style.opacity = "0.5";
    }, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStageId(stageId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverStageId(null);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, stageId: string) => {
      e.preventDefault();
      setDragOverStageId(null);

      const leadId = e.dataTransfer.getData("text/plain") || draggedLeadId.current;
      if (!leadId) return;

      // Find the lead
      const lead = leads.find((l) => l.id === leadId);
      if (!lead || lead.stageId === stageId) return;

      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stageId } : l))
      );

      try {
        const res = await fetch(`/api/leads/${leadId}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stageId }),
        });

        if (!res.ok) {
          // Revert on error
          setLeads((prev) =>
            prev.map((l) =>
              l.id === leadId ? { ...l, stageId: lead.stageId } : l
            )
          );
          toast({ title: "Erro ao mover lead", variant: "destructive" });
        }
      } catch {
        // Revert on error
        setLeads((prev) =>
          prev.map((l) =>
            l.id === leadId ? { ...l, stageId: lead.stageId } : l
          )
        );
        toast({ title: "Erro ao mover lead", variant: "destructive" });
      }

      draggedLeadId.current = null;
    },
    [leads, toast]
  );

  const handleLeadCreated = useCallback((lead: LeadCard) => {
    setLeads((prev) => [lead, ...prev]);
  }, []);

  const handlePipelineChange = useCallback((pipelineId: string) => {
    setSelectedPipelineId(pipelineId);
  }, []);

  if (!pipelines.length) {
    return (
      <Card className="border-0 shadow-sm">
        <div className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            Nenhum pipeline configurado. Configure seus pipelines para usar a visão Kanban.
          </p>
          <Link href="/settings/pipelines">
            <Button>Configurar Pipelines</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Selector */}
      <div className="flex items-center gap-3">
        <PipelineSelector
          pipelines={pipelines}
          selectedId={selectedPipelineId}
          onSelect={handlePipelineChange}
        />
        <span className="text-sm text-muted-foreground">
          {pipelineLeads.length} {pipelineLeads.length === 1 ? "lead" : "leads"} | Total:{" "}
          <span className="font-medium text-foreground">
            {formatCurrencyLocal(
              pipelineLeads.reduce((sum, l) => sum + (l.value || 0), 0)
            )}
          </span>
        </span>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leadsByStage[stage.id] || []}
            pipelineId={selectedPipelineId}
            dragOverStageId={dragOverStageId}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onLeadCreated={handleLeadCreated}
          />
        ))}
      </div>
    </div>
  );
}
