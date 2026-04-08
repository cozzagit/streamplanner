import { NextRequest, NextResponse } from "next/server";
import { getTrendingMovies } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const window = (req.nextUrl.searchParams.get("window") || "week") as "day" | "week";

  try {
    const data = await getTrendingMovies(window, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Movie trending error:", error);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}
