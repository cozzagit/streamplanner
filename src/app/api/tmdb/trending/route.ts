import { NextRequest, NextResponse } from "next/server";
import { getTrending } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const timeWindow = (req.nextUrl.searchParams.get("window") || "week") as "day" | "week";

  try {
    const data = await getTrending(timeWindow, page);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Trending fetch error:", error);
    return NextResponse.json(
      { error: "Errore nel recupero dei trending" },
      { status: 500 }
    );
  }
}
