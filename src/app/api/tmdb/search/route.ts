import { NextRequest, NextResponse } from "next/server";
import { searchSeries } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const page = Number(req.nextUrl.searchParams.get("page") || "1");

  if (!query.trim()) {
    return NextResponse.json({ results: [], total_results: 0 });
  }

  try {
    const data = await searchSeries(query, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Errore nella ricerca" },
      { status: 500 }
    );
  }
}
