import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, formatDateRelative, getInitials } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit, Mail, Phone, Building2, Target } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

async function getPerson(id: string) {
  return prisma.person.findUnique({
    where: { id },
    include: {
      organization: true,
      owner: true,
      tags: { include: { tag: true } },
      leads: { include: { stage: true }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) notFound();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/contacts/persons">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                {getInitials(`${person.firstName} ${person.lastName || ""}`)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{person.firstName} {person.lastName}</h1>
              {person.jobTitle && <p className="text-sm text-muted-foreground">{person.jobTitle}</p>}
            </div>
          </div>
        </div>
        <Link href={`/contacts/persons/${id}/edit`}>
          <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" />Editar</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">E-mail</p>
                <p className="text-sm flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {person.email || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Telefone</p>
                <p className="text-sm flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {person.phone || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Organização</p>
                {person.organization ? (
                  <Link href={`/contacts/organizations/${person.organization.id}`} className="text-sm text-primary hover:underline flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />{person.organization.name}
                  </Link>
                ) : <p className="text-sm">-</p>}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Criado em</p>
                <p className="text-sm">{formatDate(person.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-violet-600" />Leads Relacionados
              </CardTitle>
              <Link href={`/leads/new?personId=${person.id}`}>
                <Button size="sm" variant="outline">+ Lead</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {person.leads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum lead vinculado</p>
              ) : (
                <div className="space-y-2">
                  {person.leads.map((lead) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lead.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDateRelative(lead.createdAt)}</p>
                        </div>
                        {lead.stage && <Badge variant="secondary" className="text-xs shrink-0">{lead.stage.name}</Badge>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Responsável</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{person.owner?.name || "Não atribuído"}</p>
            </CardContent>
          </Card>

          {person.tags.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {person.tags.map(({ tag }) => (
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
