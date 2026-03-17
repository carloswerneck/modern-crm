import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const leadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  value: z.number().optional(),
  expectedCloseDate: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  personId: z.string().optional(),
  organizationId: z.string().optional(),
  sourceId: z.string().optional(),
  typeId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await prisma.lead.findMany({
    include: { person: true, organization: true, stage: true, owner: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Get default pipeline/stage if not provided
  let pipelineId = parsed.data.pipelineId;
  let stageId = parsed.data.stageId;

  if (!pipelineId) {
    const defaultPipeline = await prisma.pipeline.findFirst({ where: { isDefault: true }, include: { stages: { orderBy: { sortOrder: "asc" }, take: 1 } } });
    if (defaultPipeline) {
      pipelineId = defaultPipeline.id;
      if (!stageId && defaultPipeline.stages[0]) {
        stageId = defaultPipeline.stages[0].id;
      }
    }
  }

  const lead = await prisma.lead.create({
    data: {
      ...parsed.data,
      pipelineId,
      stageId,
      expectedCloseDate: parsed.data.expectedCloseDate ? new Date(parsed.data.expectedCloseDate) : undefined,
      ownerId: session.user?.id,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
