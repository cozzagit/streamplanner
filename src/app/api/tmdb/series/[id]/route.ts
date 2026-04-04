import { NextRequest, NextResponse } from "next/server";
import { getSeriesDetail } from "@/lib/tmdb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tmdbId = Number(id);

  if (!tmdbId) {
    return NextResponse.json({ error: "ID non valido" }, { status: 400 });
  }

  try {
    const data = await getSeriesDetail(tmdbId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Series detail error:", error);
    return NextResponse.json(
      { error: "Errore nel recupero dettagli" },
      { status: 500 }
    );
  }
}
