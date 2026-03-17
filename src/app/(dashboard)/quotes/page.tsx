import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams;
  const quotes = await prisma.quote.findMany({
    where: search ? { subject: { contains: search, mode: "insensitive" } } : undefined,
    include: { person: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cotações</h1>
          <p className="text-muted-foreground">Gerencie suas propostas e cotações</p>
        </div>
        <Link href="/quotes/new">
          <Button><Plus className="mr-2 h-4 w-4" />Nova Cotação</Button>
        </Link>
      </div>

      <form className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input name="search" placeholder="Buscar cotações..." defaultValue={search} className="pl-9" />
        </div>
      </form>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Assunto</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contato</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Itens</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Total</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Validade</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {quotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhuma cotação encontrada</p>
                    </td>
                  </tr>
                ) : (
                  quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="p-4">
                        <Link href={`/quotes/${quote.id}`} className="group-hover:text-primary transition-colors">
                          <p className="font-medium text-sm">{quote.subject}</p>
                        </Link>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {quote.person ? `${quote.person.firstName} ${quote.person.lastName || ""}` : "-"}
                      </td>
                      <td className="p-4 text-sm">{quote.items.length}</td>
                      <td className="p-4 text-sm font-semibold text-green-600">{formatCurrency(quote.grandTotal)}</td>
                      <td className="p-4 text-sm text-muted-foreground">{quote.expiresAt ? formatDate(quote.expiresAt) : "-"}</td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(quote.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
