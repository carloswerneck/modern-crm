import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Users, Building2, Activity, DollarSign, Clock } from "lucide-react";
import Link from "next/link";

async function getDashboardData() {
  const [
    totalLeads,
    totalPersons,
    totalOrganizations,
    totalActivities,
    recentLeads,
    upcomingActivities,
    leadsValue,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.person.count(),
    prisma.organization.count(),
    prisma.activity.count(),
    prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { person: true, stage: true },
    }),
    prisma.activity.findMany({
      take: 5,
      where: { isDone: false },
      orderBy: { createdAt: "desc" },
      include: { owner: true },
    }),
    prisma.lead.aggregate({ _sum: { value: true } }),
  ]);

  return {
    totalLeads,
    totalPersons,
    totalOrganizations,
    totalActivities,
    recentLeads,
    upcomingActivities,
    totalValue: leadsValue._sum.value || 0,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();

  const stats = [
    { title: "Total de Leads", value: data.totalLeads, icon: Target, color: "text-violet-600", bg: "bg-violet-50" },
    { title: "Valor do Pipeline", value: formatCurrency(data.totalValue), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { title: "Pessoas", value: data.totalPersons, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Organizações", value: data.totalOrganizations, icon: Building2, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">Aqui está o resumo do seu CRM.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Leads Recentes</CardTitle>
            <Link href="/leads" className="text-sm text-primary hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum lead encontrado</p>
            ) : (
              data.recentLeads.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {lead.value && <p className="text-sm font-semibold text-green-600">{formatCurrency(lead.value)}</p>}
                      {lead.stage && <Badge variant="secondary" className="text-xs">{lead.stage.name}</Badge>}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Atividades Pendentes</CardTitle>
            <Link href="/activities" className="text-sm text-primary hover:underline">Ver todas</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade pendente</p>
            ) : (
              data.upcomingActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activity.scheduledAt ? formatDate(activity.scheduledAt, "dd/MM HH:mm") : "Sem data"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{activity.type}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
