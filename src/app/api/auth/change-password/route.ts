import { NextRequest, NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Tutti i campi sono richiesti" }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "La nuova password deve avere almeno 6 caratteri" }, { status: 400 });
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  const isValid = await compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Password attuale non corretta" }, { status: 400 });
  }

  const passwordHash = await hash(newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true, message: "Password aggiornata" });
}
