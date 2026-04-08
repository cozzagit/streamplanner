import { NextRequest, NextResponse } from "next/server";
import { searchMovies } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") || "";
  const page = Number(req.nextUrl.searchParams.get("page") || "1");

  if (!query) {
    return NextResponse.json({ results: [], total_pages: 0 });
  }

  try {
    const data = await searchMovies(query, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Movie search error:", error);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}
