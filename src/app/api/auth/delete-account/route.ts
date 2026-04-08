import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { password } = await request.json();
  if (!password) {
    return NextResponse.json({ error: "Inserisci la password per confermare" }, { status: 400 });
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "Password non corretta" }, { status: 400 });
  }

  // CASCADE deletes watchlist, settings, subscriptions, rotation_plans
  await db.delete(users).where(eq(users.id, session.user.id));

  return NextResponse.json({ success: true, message: "Account eliminato" });
}
