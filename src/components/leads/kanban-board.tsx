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
  owner: { name: string } | null;
  tags: Tag[];
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
        className="p-3 border shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing bg-white group hover:border-primary/30"
      >
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {lead.title}
            </p>

            {personName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{personName}</span>
              </div>
            )}

            {lead.organization && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{lead.organization.name}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              {lead.value ? (
                <span className="text-xs font-semibold text-green-600">
                  {formatCurrencyLocal(lead.value)}
                </span>
              ) : (
                <span />
              )}
            </div>

            {lead.tags && lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {lead.tags.map((lt) => (
                  <span
                    key={lt.tag.id}
                    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: lt.tag.color + "20",
                      color: lt.tag.color,
                    }}
                  >
                    {lt.tag.name}
                  </span>
                ))}
              </div>
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
      className={`flex flex-col min-w-[280px] max-w-[320px] w-[300px] shrink-0 rounded-xl transition-all duration-200 ${
        isDragOver ? "ring-2 ring-primary/40 bg-primary/5" : "bg-muted/30"
      }`}
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, stage.id)}
    >
      {/* Column Header */}
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${getProbabilityColor(stage.probability)}`} />
            <h3 className="text-sm font-semibold truncate">{stage.name}</h3>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {leads.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-muted-foreground font-medium pl-4.5">
            {formatCurrencyLocal(totalValue)}
          </p>
        )}
        <div className={`h-1 rounded-full ${getProbabilityColor(stage.probability)} opacity-60`} />
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
