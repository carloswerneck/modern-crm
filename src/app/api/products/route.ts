import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0).default(0),
  quantity: z.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const products = await prisma.product.findMany({
    where: search
      ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }] }
      : undefined,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      description: parsed.data.description || null,
      price: parsed.data.price,
      quantity: parsed.data.quantity,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
