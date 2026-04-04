import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { users, settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e password sono richiesti" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La password deve avere almeno 6 caratteri" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Email gia registrata" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning();

    // Create default settings for new user
    await db.insert(settings).values([
      { userId: user.id, key: "monthly_budget", value: "15" },
      { userId: user.id, key: "excluded_platforms", value: "[]" },
      { userId: user.id, key: "always_on_platforms", value: "[]" },
      { userId: user.id, key: "active_subscriptions", value: "[]" },
    ]);

    return NextResponse.json(
      { success: true, user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Errore nella registrazione" },
      { status: 500 }
    );
  }
}
