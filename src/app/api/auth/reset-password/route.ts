import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const { token, password } = await request.json();

  if (!token || !password) {
    return NextResponse.json({ error: "Token e password richiesti" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La password deve avere almeno 6 caratteri" }, { status: 400 });
  }

  // Find valid token
  const [resetToken] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!resetToken) {
    return NextResponse.json(
      { error: "Link non valido o scaduto. Richiedi un nuovo reset." },
      { status: 400 }
    );
  }

  // Update password
  const passwordHash = await hash(password, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, resetToken.userId));

  // Mark token as used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetToken.id));

  return NextResponse.json({ success: true, message: "Password aggiornata con successo" });
}
