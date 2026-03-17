import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  event: z.string().min(1),
  method: z.string().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const webhooks = await prisma.webhook.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(webhooks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const webhook = await prisma.webhook.create({
    data: {
      name: parsed.data.name,
      url: parsed.data.url,
      event: parsed.data.event,
      method: parsed.data.method || "POST",
      active: parsed.data.active ?? true,
    },
  });
  return NextResponse.json(webhook, { status: 201 });
}
