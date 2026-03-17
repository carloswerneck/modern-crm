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

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  rottenDays: z.number().optional(),
  stages: z.array(stageSchema).optional(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  if (parsed.data.isDefault) {
    await prisma.pipeline.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  // If stages are provided, delete old ones and recreate
  if (parsed.data.stages) {
    await prisma.stage.deleteMany({ where: { pipelineId: id, leads: { none: {} } } });

    const { stages, ...pipelineData } = parsed.data;
    const pipeline = await prisma.pipeline.update({
      where: { id },
      data: {
        ...pipelineData,
        stages: {
          create: stages.map((s, i) => ({
            name: s.name,
            code: s.code,
            probability: s.probability ?? 0,
            sortOrder: s.sortOrder ?? i,
          })),
        },
      },
      include: { stages: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json(pipeline);
  }

  const { stages: _stages, ...pipelineData } = parsed.data;
  const pipeline = await prisma.pipeline.update({
    where: { id },
    data: pipelineData,
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(pipeline);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await prisma.pipeline.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
