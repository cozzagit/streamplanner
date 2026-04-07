import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { watchlist, series } from "@/db/schema";
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
    if (body.watchedEpisodes !== undefined)
      updates.watchedEpisodes = body.watchedEpisodes;

    // Auto-status management based on watchedEpisodes
    if (body.watchedEpisodes !== undefined && !body.status) {
      const [item] = await db
        .select({ seriesId: watchlist.seriesId, status: watchlist.status })
        .from(watchlist)
        .where(and(eq(watchlist.id, id), eq(watchlist.userId, user.id)));

      if (item) {
        const [seriesData] = await db
          .select({ numberOfEpisodes: series.numberOfEpisodes })
          .from(series)
          .where(eq(series.id, item.seriesId));

        const totalEpisodes = seriesData?.numberOfEpisodes || 0;
        const watched = body.watchedEpisodes;

        if (watched === 0) {
          // Reset to to_watch if cleared
          updates.status = "to_watch";
        } else if (totalEpisodes > 0 && watched >= totalEpisodes) {
          // All episodes watched → completed
          updates.status = "completed";
        } else if (watched > 0) {
          // Some episodes watched but not all → watching
          // This also fixes: completed→watching when user reduces count
          if (item.status === "to_watch" || item.status === "completed") {
            updates.status = "watching";
          }
        }
      }
    }

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
