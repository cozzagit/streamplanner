import { NextRequest, NextResponse } from "next/server";
import { getSeasonEpisodes } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const seriesId = Number(req.nextUrl.searchParams.get("seriesId") || "0");
  const season = Number(req.nextUrl.searchParams.get("season") || "1");

  if (!seriesId) {
    return NextResponse.json({ error: "seriesId richiesto" }, { status: 400 });
  }

  try {
    const data = await getSeasonEpisodes(seriesId, season);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Season fetch error:", error);
    return NextResponse.json(
      { error: "Errore nel recupero stagione" },
      { status: 500 }
    );
  }
}
