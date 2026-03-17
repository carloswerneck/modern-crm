"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

const productSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  sku: z.string().optional(),
  description: z.string().optional(),
  price: z.string().optional(),
  quantity: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/products/${id}`);

        if (!res.ok) {
          toast({ title: "Produto não encontrado", variant: "destructive" });
          router.push("/products");
          return;
        }

        const product = await res.json();

        reset({
          name: product.name || "",
          sku: product.sku || "",
          description: product.description || "",
          price: product.price != null ? String(product.price) : "",
          quantity: product.quantity != null ? String(product.quantity) : "",
        });
      } catch {
        toast({ title: "Erro ao carregar dados", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = async (data: ProductFormData) => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        sku: data.sku || null,
        description: data.description || null,
        price: data.price ? parseFloat(data.price) : 0,
        quantity: data.quantity ? parseInt(data.quantity, 10) : 0,
      }),
    });

    if (res.ok) {
      toast({ title: "Produto atualizado com sucesso!" });
      router.push(`/products/${id}`);
    } else {
      toast({ title: "Erro ao atualizar produto", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/products/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Produto</h1>
          <p className="text-muted-foreground">Atualize as informações do produto</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Ex: Licença de Software Anual"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                placeholder="Ex: PROD-001"
                {...register("sku")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o produto..."
                rows={3}
                {...register("description")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  {...register("price")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade em Estoque</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  {...register("quantity")}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
              <Link href={`/products/${id}`}>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
