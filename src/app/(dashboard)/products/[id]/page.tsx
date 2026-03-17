import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit, Package } from "lucide-react";

async function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
  });
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/products">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">Criado em {formatDate(product.createdAt)}</p>
          </div>
        </div>
        <Link href={`/products/${id}/edit`}>
          <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" />Editar</Button>
        </Link>
      </div>

      <div className="max-w-2xl">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-violet-600" />Detalhes do Produto
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Nome</p>
              <p className="text-sm font-medium">{product.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">SKU</p>
              <p className="text-sm font-mono">{product.sku || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Preço</p>
              <p className="text-sm font-semibold text-green-600">{formatCurrency(product.price)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Quantidade em Estoque</p>
              <p className="text-sm">{product.quantity}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Criado em</p>
              <p className="text-sm">{formatDate(product.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Atualizado em</p>
              <p className="text-sm">{formatDate(product.updatedAt)}</p>
            </div>
            {product.description && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Descrição</p>
                <p className="text-sm">{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
