import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { name, email } = await request.json();

  if (!name && !email) {
    return NextResponse.json({ error: "Nessun campo da aggiornare" }, { status: 400 });
  }

  // Check email uniqueness if changing
  if (email) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: "Email gia in uso da un altro account" }, { status: 409 });
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name) updates.name = name.trim();
  if (email) updates.email = email.toLowerCase().trim();

  await db.update(users).set(updates).where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true, message: "Profilo aggiornato" });
}
