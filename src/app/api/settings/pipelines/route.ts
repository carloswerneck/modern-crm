import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const stageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  code: z.string().min(1),
  probability: z.number().min(0).max(100).optional(),
  sortOrder: z.number().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
  rottenDays: z.number().optional(),
  stages: z.array(stageSchema).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pipelines = await prisma.pipeline.findMany({
    include: { stages: { orderBy: { sortOrder: "asc" } }, _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pipelines);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if (parsed.data.isDefault) {
    await prisma.pipeline.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const pipeline = await prisma.pipeline.create({
    data: {
      name: parsed.data.name,
      isDefault: parsed.data.isDefault ?? false,
      rottenDays: parsed.data.rottenDays ?? 30,
      stages: parsed.data.stages
        ? { create: parsed.data.stages.map((s, i) => ({ name: s.name, code: s.code, probability: s.probability ?? 0, sortOrder: s.sortOrder ?? i })) }
        : undefined,
    },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(pipeline, { status: 201 });
}
