import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, User, Search, Mail, Phone, Building2 } from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

async function getPersons(search?: string) {
  return prisma.person.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { organization: true, _count: { select: { leads: true } } },
    orderBy: { firstName: "asc" },
  });
}

export default async function PersonsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams;
  const persons = await getPersons(search);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pessoas</h1>
          <p className="text-muted-foreground">Gerencie seus contatos</p>
        </div>
        <Link href="/contacts/persons/new">
          <Button><Plus className="mr-2 h-4 w-4" />Nova Pessoa</Button>
        </Link>
      </div>

      <form className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input name="search" placeholder="Buscar pessoas..." defaultValue={search} className="pl-9" />
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {persons.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Nenhuma pessoa encontrada</p>
            <Link href="/contacts/persons/new">
              <Button variant="outline" className="mt-3" size="sm"><Plus className="mr-2 h-4 w-4" />Adicionar pessoa</Button>
            </Link>
          </div>
        ) : (
          persons.map((person) => (
            <Link key={person.id} href={`/contacts/persons/${person.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                        {getInitials(`${person.firstName} ${person.lastName || ""}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{person.firstName} {person.lastName}</p>
                      {person.jobTitle && <p className="text-xs text-muted-foreground truncate">{person.jobTitle}</p>}
                      {person.organization && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />{person.organization.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {person.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{person.email}</span>
                      </p>
                    )}
                    {person.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />{person.phone}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{person._count.leads} lead(s)</span>
                    <span>{formatDate(person.createdAt)}</span>
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
