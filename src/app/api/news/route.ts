import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface NewsArticle {
  title: string;
  link: string;
  source: string;
  date: string;
}

/** Parse Google News RSS XML into articles */
function parseRssXml(xml: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim() || "";
    const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || "";
    const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const source = sourceMatch?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").trim() || "";
    const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";

    // Format date to relative
    let date = "";
    if (pubDate) {
      const d = new Date(pubDate);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffHours < 1) date = "Adesso";
      else if (diffHours < 24) date = `${diffHours}h fa`;
      else if (diffDays < 7) date = `${diffDays}g fa`;
      else date = d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
    }

    if (title && link) {
      articles.push({ title, link, source, date });
    }
  }

  return articles;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ articles: [] });
  }

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=it&gl=IT&ceid=IT:it`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(rssUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "StreamPlanner/1.0",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ articles: [] });
    }

    const xml = await res.text();
    const articles = parseRssXml(xml).slice(0, 8);

    return NextResponse.json({ articles });
  } catch {
    return NextResponse.json({ articles: [] });
  }
}
