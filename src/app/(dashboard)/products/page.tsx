import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Package, Search } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams;
  const products = await prisma.product.findMany({
    where: search
      ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }] }
      : undefined,
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
        </div>
        <Link href="/products/new">
          <Button><Plus className="mr-2 h-4 w-4" />Novo Produto</Button>
        </Link>
      </div>

      <form className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input name="search" placeholder="Buscar produtos..." defaultValue={search} className="pl-9" />
        </div>
      </form>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Produto</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">SKU</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Preço</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estoque</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Nenhum produto encontrado</p>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="p-4">
                        <Link href={`/products/${product.id}`} className="group-hover:text-primary transition-colors">
                          <p className="font-medium text-sm">{product.name}</p>
                          {product.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{product.description}</p>}
                        </Link>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground font-mono">{product.sku || "-"}</td>
                      <td className="p-4 text-sm font-semibold text-green-600">{formatCurrency(product.price)}</td>
                      <td className="p-4 text-sm">{product.quantity}</td>
                      <td className="p-4 text-sm text-muted-foreground">{formatDate(product.createdAt)}</td>
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
