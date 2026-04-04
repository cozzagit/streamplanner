import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser, unauthorized } from "@/lib/get-user";

// PATCH — update watchlist item (status, priority, progress)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.status) updates.status = body.status;
    if (body.priority) updates.priority = body.priority;
    if (body.currentSeason !== undefined)
      updates.currentSeason = body.currentSeason;
    if (body.currentEpisode !== undefined)
      updates.currentEpisode = body.currentEpisode;
    if (body.notes !== undefined) updates.notes = body.notes;

    const [updated] = await db
      .update(watchlist)
      .set(updates)
      .where(and(eq(watchlist.id, id), eq(watchlist.userId, user.id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Watchlist PATCH error:", error);
    return NextResponse.json(
      { error: "Errore nell'aggiornamento" },
      { status: 500 }
    );
  }
}
