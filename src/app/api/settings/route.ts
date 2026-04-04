import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser, unauthorized } from "@/lib/get-user";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const allSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, user.id));

    const result: Record<string, string> = {};
    allSettings.forEach((s) => {
      result[s.key] = s.value;
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({});
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      await db
        .insert(settings)
        .values({ userId: user.id, key, value: String(value) })
        .onConflictDoUpdate({
          target: [settings.userId, settings.key],
          set: { value: String(value), updatedAt: new Date() },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json(
      { error: "Errore nel salvataggio" },
      { status: 500 }
    );
  }
}
