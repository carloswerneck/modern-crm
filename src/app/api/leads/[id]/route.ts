import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  value: z.number().optional().nullable(),
  expectedCloseDate: z.string().optional().nullable(),
  pipelineId: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
  personId: z.string().optional().nullable(),
  organizationId: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  typeId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  lostReason: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { person: true, organization: true, stage: true, pipeline: true, owner: true, source: true, type: true, tags: { include: { tag: true } } },
  });

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { expectedCloseDate, value, ...rest } = parsed.data;

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...rest,
      value: value !== undefined ? value : undefined,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : expectedCloseDate === null ? null : undefined,
    },
  });

  return NextResponse.json(lead);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
