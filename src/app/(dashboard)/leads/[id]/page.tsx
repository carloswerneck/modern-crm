import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate, formatDateRelative, activityTypeColors, activityTypeLabels } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit, Target, User, Building2, Mail, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

async function getLead(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      person: true,
      organization: true,
      stage: true,
      pipeline: true,
      owner: true,
      source: true,
      type: true,
      tags: { include: { tag: true } },
      activities: {
        include: { activity: { include: { owner: true } } },
        orderBy: { activity: { createdAt: "desc" } },
        take: 10,
      },
    },
  });
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/leads">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{lead.title}</h1>
            <p className="text-sm text-muted-foreground">Criado {formatDateRelative(lead.createdAt)}</p>
          </div>
        </div>
        <Link href={`/leads/${id}/edit`}>
          <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" />Editar</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-violet-600" />Detalhes do Lead
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Etapa</p>
                {lead.stage ? <Badge variant="secondary">{lead.stage.name}</Badge> : <span className="text-sm">-</span>}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Valor</p>
                <p className="text-sm font-semibold text-green-600">{lead.value ? formatCurrency(lead.value) : "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Pipeline</p>
                <p className="text-sm">{lead.pipeline?.name || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Previsão de Fechamento</p>
                <p className="text-sm">{lead.expectedCloseDate ? formatDate(lead.expectedCloseDate) : "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Fonte</p>
                <p className="text-sm">{lead.source?.name || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Tipo</p>
                <p className="text-sm">{lead.type?.name || "-"}</p>
              </div>
              {lead.description && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-sm">{lead.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" />Atividades
              </CardTitle>
              <Link href={`/activities/new?leadId=${lead.id}`}>
                <Button size="sm" variant="outline">+ Adicionar</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {lead.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade registrada</p>
              ) : (
                <div className="space-y-3">
                  {lead.activities.map(({ activity }) => (
                    <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full", activityTypeColors[activity.type])}>
                            {activityTypeLabels[activity.type]}
                          </span>
                          {activity.isDone && (
                            <Badge className="text-xs bg-green-100 text-green-700 border-0">Concluído</Badge>
                          )}
                        </div>
                        {activity.comment && <p className="text-xs text-muted-foreground mt-1">{activity.comment}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.scheduledAt ? formatDate(activity.scheduledAt, "dd/MM/yyyy HH:mm") : formatDateRelative(activity.createdAt)}
                          {activity.owner && ` • ${activity.owner.name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {lead.person && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />Contato
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/contacts/persons/${lead.person.id}`}>
                  <div className="hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors">
                    <p className="font-medium text-sm">{lead.person.firstName} {lead.person.lastName}</p>
                    {lead.person.jobTitle && <p className="text-xs text-muted-foreground">{lead.person.jobTitle}</p>}
                    {lead.person.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />{lead.person.email}
                      </p>
                    )}
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {lead.organization && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-orange-600" />Organização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/contacts/organizations/${lead.organization.id}`}>
                  <div className="hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors">
                    <p className="font-medium text-sm">{lead.organization.name}</p>
                    {lead.organization.website && <p className="text-xs text-muted-foreground">{lead.organization.website}</p>}
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Responsável</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{lead.owner?.name || "Não atribuído"}</p>
              {lead.owner?.email && <p className="text-xs text-muted-foreground">{lead.owner.email}</p>}
            </CardContent>
          </Card>

          {lead.tags.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map(({ tag }) => (
                    <span key={tag.id} className="text-xs px-2 py-1 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
