import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Building2, Search, Mail, Phone, Globe, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";

async function getOrganizations(search?: string) {
  return prisma.organization.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
    include: { _count: { select: { persons: true, leads: true } } },
    orderBy: { name: "asc" },
  });
}

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams;
  const organizations = await getOrganizations(search);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizações</h1>
          <p className="text-muted-foreground">Gerencie suas empresas e clientes</p>
        </div>
        <Link href="/contacts/organizations/new">
          <Button><Plus className="mr-2 h-4 w-4" />Nova Organização</Button>
        </Link>
      </div>

      <form className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input name="search" placeholder="Buscar organizações..." defaultValue={search} className="pl-9" />
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizations.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma organização encontrada</p>
            <Link href="/contacts/organizations/new">
              <Button variant="outline" className="mt-3" size="sm"><Plus className="mr-2 h-4 w-4" />Adicionar organização</Button>
            </Link>
          </div>
        ) : (
          organizations.map((org) => (
            <Link key={org.id} href={`/contacts/organizations/${org.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{org.name}</p>
                      {org.city && <p className="text-xs text-muted-foreground">{org.city}{org.country ? `, ${org.country}` : ""}</p>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {org.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{org.email}</span>
                      </p>
                    )}
                    {org.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />{org.phone}
                      </p>
                    )}
                    {org.website && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Globe className="h-3 w-3 shrink-0" /><span className="truncate">{org.website}</span>
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{org._count.persons} pessoa(s)</span>
                    <span>{org._count.leads} lead(s)</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
