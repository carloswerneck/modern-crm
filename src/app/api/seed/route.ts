import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    // Delete existing admin
    await prisma.user.deleteMany({ where: { email: "admin@crm.com" } });

    // Create admin with proper bcrypt hash
    const hashedPassword = await bcrypt.hash("admin123", 12);
    const user = await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin@crm.com",
        password: hashedPassword,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Admin criado com sucesso",
      userId: user.id,
      passwordHash: hashedPassword,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
