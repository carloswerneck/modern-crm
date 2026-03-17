import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Target, DollarSign, TrendingUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import KanbanBoard from "@/components/leads/kanban-board";
import LeadsViewToggle from "@/components/leads/leads-view-toggle";

async function getLeads(search?: string) {
  return prisma.lead.findMany({
    where: search ? { title: { contains: search, mode: "insensitive" } } : undefined,
    include: {
      person: true,
      organization: true,
      stage: true,
      owner: true,
      source: true,
      tags: { include: { tag: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getPipelines() {
  return prisma.pipeline.findMany({
    include: {
      stages: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { isDefault: "desc" },
  });
}

async function getStats() {
  const [total, pipeline] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.aggregate({ _sum: { value: true } }),
  ]);
  return { total, pipeline: pipeline._sum.value || 0 };
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; view?: string }>;
}) {
  const { search, view } = await searchParams;
  const currentView = view === "lista" ? "lista" : "kanban";

  const [leads, stats, pipelines] = await Promise.all([
    getLeads(search),
    getStats(),
    getPipelines(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Gerencie seus leads e oportunidades</p>
        </div>
        <div className="flex items-center gap-3">
          <LeadsViewToggle view={currentView} />
          <Link href="/leads/new">
            <Button><Plus className="mr-2 h-4 w-4" />Novo Lead</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-violet-50 rounded-lg"><Target className="h-5 w-5 text-violet-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Leads</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Valor do Pipeline</p>
              <p className="text-xl font-bold">{formatCurrency(stats.pipeline)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Ticket Médio</p>
              <p className="text-xl font-bold">
                {stats.total > 0 ? formatCurrency(stats.pipeline / stats.total) : formatCurrency(0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {currentView === "kanban" ? (
        <KanbanBoard
          pipelines={pipelines}
          leads={leads.map((l) => ({
            id: l.id,
            title: l.title,
            value: l.value,
            stageId: l.stageId,
            person: l.person,
            organization: l.organization,
            owner: l.owner,
            tags: l.tags,
          }))}
        />
      ) : (
        <>
          <form className="max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input name="search" placeholder="Buscar leads..." defaultValue={search} className="pl-9" />
            </div>
          </form>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Lead</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contato</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Etapa</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Valor</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Responsável</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Criado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-muted-foreground">
                          <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
                          <p>Nenhum lead encontrado</p>
                          <Link href="/leads/new">
                            <Button variant="outline" className="mt-3" size="sm">
                              <Plus className="mr-2 h-4 w-4" />Criar primeiro lead
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ) : (
                      leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="p-4">
                            <Link href={`/leads/${lead.id}`} className="group-hover:text-primary transition-colors">
                              <p className="font-medium text-sm">{lead.title}</p>
                              {lead.organization && <p className="text-xs text-muted-foreground">{lead.organization.name}</p>}
                            </Link>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {lead.person ? `${lead.person.firstName} ${lead.person.lastName || ""}` : "-"}
                          </td>
                          <td className="p-4">
                            {lead.stage ? (
                              <Badge variant="secondary" className="text-xs">{lead.stage.name}</Badge>
                            ) : <span className="text-muted-foreground text-xs">-</span>}
                          </td>
                          <td className="p-4 text-sm font-medium">
                            {lead.value ? <span className="text-green-600">{formatCurrency(lead.value)}</span> : <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{lead.owner?.name || "-"}</td>
                          <td className="p-4 text-sm text-muted-foreground">{formatDate(lead.createdAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
