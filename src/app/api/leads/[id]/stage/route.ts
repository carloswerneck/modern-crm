import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const stageUpdateSchema = z.object({
  stageId: z.string().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body = await req.json();
  const parsed = stageUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Verify the stage exists and get its pipeline
  const stage = await prisma.stage.findUnique({
    where: { id: parsed.data.stageId },
    include: { pipeline: true },
  });

  if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      stageId: parsed.data.stageId,
      pipelineId: stage.pipelineId,
    },
    include: { person: true, organization: true, stage: true, owner: true, tags: { include: { tag: true } } },
  });

  return NextResponse.json(lead);
}
