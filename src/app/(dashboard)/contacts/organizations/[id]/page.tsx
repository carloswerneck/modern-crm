import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, formatDateRelative } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit, Mail, Phone, Globe, MapPin, Users, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

async function getOrganization(id: string) {
  return prisma.organization.findUnique({
    where: { id },
    include: {
      owner: true,
      persons: { take: 10 },
      leads: { include: { stage: true }, orderBy: { createdAt: "desc" }, take: 10 },
      tags: { include: { tag: true } },
    },
  });
}

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await getOrganization(id);
  if (!org) notFound();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/contacts/organizations">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{org.name}</h1>
            <p className="text-sm text-muted-foreground">Criado {formatDateRelative(org.createdAt)}</p>
          </div>
        </div>
        <Link href={`/contacts/organizations/${id}/edit`}>
          <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" />Editar</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informações</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">E-mail</p>
                <p className="text-sm flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{org.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Telefone</p>
                <p className="text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{org.phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Website</p>
                <p className="text-sm flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-muted-foreground" />{org.website || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Localização</p>
                <p className="text-sm flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {[org.city, org.state, org.country].filter(Boolean).join(", ") || "-"}
                </p>
              </div>
              {org.address && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Endereço</p>
                  <p className="text-sm">{org.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />Pessoas ({org.persons.length})
              </CardTitle>
              <Link href={`/contacts/persons/new?organizationId=${org.id}`}>
                <Button size="sm" variant="outline">+ Pessoa</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {org.persons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pessoa vinculada</p>
              ) : (
                <div className="space-y-2">
                  {org.persons.map((person) => (
                    <Link key={person.id} href={`/contacts/persons/${person.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{person.firstName} {person.lastName}</p>
                          {person.jobTitle && <p className="text-xs text-muted-foreground">{person.jobTitle}</p>}
                        </div>
                        {person.email && <p className="text-xs text-muted-foreground truncate">{person.email}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-violet-600" />Leads ({org.leads.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {org.leads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum lead vinculado</p>
              ) : (
                <div className="space-y-2">
                  {org.leads.map((lead) => (
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
              <p className="text-sm">{org.owner?.name || "Não atribuído"}</p>
            </CardContent>
          </Card>

          {org.tags.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {org.tags.map(({ tag }) => (
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
