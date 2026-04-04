import { NextRequest, NextResponse } from "next/server";
import { discoverByProvider } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const providerId = Number(req.nextUrl.searchParams.get("provider") || "0");
  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const sortBy = req.nextUrl.searchParams.get("sort") || "popularity.desc";
  const minVote = Number(req.nextUrl.searchParams.get("minVote") || "0");
  const dateFrom = req.nextUrl.searchParams.get("from") || undefined;
  const dateTo = req.nextUrl.searchParams.get("to") || undefined;

  if (!providerId) {
    return NextResponse.json(
      { error: "Provider ID richiesto" },
      { status: 400 }
    );
  }

  try {
    const data = await discoverByProvider(providerId, {
      page,
      sortBy,
      minVote: minVote || undefined,
      dateFrom,
      dateTo,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Discover fetch error:", error);
    return NextResponse.json(
      { error: "Errore nel discover" },
      { status: 500 }
    );
  }
}
