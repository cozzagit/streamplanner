import { NextRequest, NextResponse } from "next/server";
import { discoverMovies } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const providerParam = req.nextUrl.searchParams.get("provider");
  const providerId = providerParam ? Number(providerParam) : null;
  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const sortBy = req.nextUrl.searchParams.get("sort") || "popularity.desc";
  const minVote = Number(req.nextUrl.searchParams.get("minVote") || "0");
  const minVoteCount = Number(req.nextUrl.searchParams.get("minVoteCount") || "0");
  const dateFrom = req.nextUrl.searchParams.get("from") || undefined;
  const dateTo = req.nextUrl.searchParams.get("to") || undefined;
  const withoutGenres = req.nextUrl.searchParams.get("withoutGenres") || undefined;

  try {
    const data = await discoverMovies(providerId, {
      page, sortBy,
      minVote: minVote || undefined,
      minVoteCount: minVoteCount || undefined,
      dateFrom, dateTo, withoutGenres,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Movie discover error:", error);
    return NextResponse.json({ error: "Errore" }, { status: 500 });
  }
}
