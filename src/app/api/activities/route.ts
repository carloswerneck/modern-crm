import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const activitySchema = z.object({
  title: z.string().min(1),
  type: z.enum(["CALL", "MEETING", "TASK", "NOTE", "EMAIL"]),
  comment: z.string().optional(),
  location: z.string().optional(),
  scheduledAt: z.string().optional(),
  endsAt: z.string().optional(),
  leadId: z.string().optional(),
  personId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activities = await prisma.activity.findMany({
    include: { owner: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(activities);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = activitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { leadId, personId, ...data } = parsed.data;

  const activity = await prisma.activity.create({
    data: {
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      ownerId: session.user?.id,
      leads: leadId ? { create: { leadId } } : undefined,
      persons: personId ? { create: { personId } } : undefined,
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
