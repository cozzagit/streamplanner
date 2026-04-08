import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, passwordResetEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://streamplanner.vibecanyon.com";

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email richiesta" }, { status: 400 });
  }

  // Always return success to prevent email enumeration
  const successResponse = NextResponse.json({
    success: true,
    message: "Se l'email esiste, riceverai un link per reimpostare la password.",
  });

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user) return successResponse;

  // Generate token (URL-safe)
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    token,
    expiresAt,
  });

  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  await sendEmail(user.email, passwordResetEmail(user.name, resetUrl));

  return successResponse;
}
