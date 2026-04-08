import { NextRequest, NextResponse } from "next/server";
import { getMovieDetail } from "@/lib/tmdb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await getMovieDetail(Number(id));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Movie detail error:", error);
    return NextResponse.json({ error: "Film non trovato" }, { status: 404 });
  }
}
