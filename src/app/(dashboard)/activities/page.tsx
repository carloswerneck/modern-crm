import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Activity, Search, Calendar, CheckCircle, Clock } from "lucide-react";
import { formatDate, activityTypeLabels, activityTypeColors, cn } from "@/lib/utils";

async function getActivities(search?: string) {
  return prisma.activity.findMany({
    where: search ? { title: { contains: search, mode: "insensitive" } } : undefined,
    include: {
      owner: true,
      leads: { include: { lead: true }, take: 1 },
      persons: { include: { person: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams;
  const activities = await getActivities(search);
  const pending = activities.filter((a) => !a.isDone).length;
  const done = activities.filter((a) => a.isDone).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Atividades</h1>
          <p className="text-muted-foreground">Gerencie suas tarefas e compromissos</p>
        </div>
        <Link href="/activities/new">
          <Button><Plus className="mr-2 h-4 w-4" />Nova Atividade</Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{activities.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{done}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
      </div>

      <form className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input name="search" placeholder="Buscar atividades..." defaultValue={search} className="pl-9" />
        </div>
      </form>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y">
            {activities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma atividade encontrada</p>
                <Link href="/activities/new">
                  <Button variant="outline" className="mt-3" size="sm"><Plus className="mr-2 h-4 w-4" />Criar atividade</Button>
                </Link>
              </div>
            ) : (
              activities.map((activity) => {
                const relatedLead = activity.leads[0]?.lead;
                const relatedPerson = activity.persons[0]?.person;
                return (
                  <div key={activity.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      activity.isDone ? "bg-green-100" : "bg-amber-100"
                    )}>
                      {activity.isDone
                        ? <CheckCircle className="w-4 h-4 text-green-600" />
                        : <Clock className="w-4 h-4 text-amber-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("text-sm font-medium", activity.isDone && "line-through text-muted-foreground")}>
                          {activity.title}
                        </p>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", activityTypeColors[activity.type])}>
                          {activityTypeLabels[activity.type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {activity.scheduledAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(activity.scheduledAt, "dd/MM/yyyy HH:mm")}
                          </span>
                        )}
                        {relatedLead && <span>• Lead: {relatedLead.title}</span>}
                        {relatedPerson && <span>• {relatedPerson.firstName} {relatedPerson.lastName}</span>}
                        {activity.owner && <span>• {activity.owner.name}</span>}
                      </div>
                    </div>
                    {activity.comment && (
                      <p className="text-xs text-muted-foreground max-w-[200px] truncate hidden md:block">
                        {activity.comment}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
