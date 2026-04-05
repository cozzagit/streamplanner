/** Static platform config — maps TMDB provider IDs to our tracked platforms.
 *  Provider IDs verified from TMDB /watch/providers/tv?watch_region=IT
 *  Netflix (8) and Amazon Prime (9/119) are EXCLUDED — user already has them.
 */

export interface PlatformConfig {
  tmdbId: number;
  name: string;
  slug: string;
  color: string;
  monthlyPrice: number;
  isFree: boolean;
  icon: string;
}

export const TRACKED_PLATFORMS: PlatformConfig[] = [
  {
    tmdbId: 8,
    name: "Netflix",
    slug: "netflix",
    color: "#E50914",
    monthlyPrice: 7.99,
    isFree: false,
    icon: "🎬",
  },
  {
    tmdbId: 119,
    name: "Amazon Prime Video",
    slug: "amazon-prime",
    color: "#00A8E1",
    monthlyPrice: 4.99,
    isFree: false,
    icon: "📦",
  },
  {
    tmdbId: 337,
    name: "Disney+",
    slug: "disney-plus",
    color: "#0063E5",
    monthlyPrice: 5.99,
    isFree: false,
    icon: "🏰",
  },
  {
    tmdbId: 350,
    name: "Apple TV+",
    slug: "apple-tv-plus",
    color: "#a3a3a3",
    monthlyPrice: 9.99,
    isFree: false,
    icon: "🍎",
  },
  {
    tmdbId: 531,
    name: "Paramount+",
    slug: "paramount-plus",
    color: "#0064FF",
    monthlyPrice: 7.99,
    isFree: false,
    icon: "⛰️",
  },
  {
    tmdbId: 1796,
    name: "NOW",
    slug: "now-sky",
    color: "#00E054",
    monthlyPrice: 6.99,
    isFree: false,
    icon: "📺",
  },
  {
    tmdbId: 283,
    name: "Crunchyroll",
    slug: "crunchyroll",
    color: "#F47521",
    monthlyPrice: 4.99,
    isFree: false,
    icon: "🍥",
  },
  {
    tmdbId: 584,
    name: "Discovery+",
    slug: "discovery-plus",
    color: "#003BE5",
    monthlyPrice: 3.99,
    isFree: false,
    icon: "🔍",
  },
  {
    tmdbId: 11,
    name: "MUBI",
    slug: "mubi",
    color: "#001A22",
    monthlyPrice: 7.99,
    isFree: false,
    icon: "🎬",
  },
  {
    tmdbId: 222,
    name: "RaiPlay",
    slug: "raiplay",
    color: "#003CA6",
    monthlyPrice: 0,
    isFree: true,
    icon: "📡",
  },
  {
    tmdbId: 300,
    name: "Pluto TV",
    slug: "pluto-tv",
    color: "#2D2D2D",
    monthlyPrice: 0,
    isFree: true,
    icon: "🪐",
  },
  {
    tmdbId: 359,
    name: "Mediaset Infinity",
    slug: "mediaset-infinity",
    color: "#1428A0",
    monthlyPrice: 0,
    isFree: true,
    icon: "♾️",
  },
];

/** All tracked provider IDs for filtering */
export const TRACKED_PROVIDER_IDS = TRACKED_PLATFORMS.map((p) => p.tmdbId);

/** Default active subscription slugs for new users */
export const DEFAULT_ACTIVE_SUBSCRIPTIONS = ["netflix", "amazon-prime"];

export function getPlatformByTmdbId(tmdbId: number): PlatformConfig | undefined {
  return TRACKED_PLATFORMS.find((p) => p.tmdbId === tmdbId);
}

export function getPlatformBySlug(slug: string): PlatformConfig | undefined {
  return TRACKED_PLATFORMS.find((p) => p.slug === slug);
}

/** Get all paid platforms sorted by price */
export function getPaidPlatforms(): PlatformConfig[] {
  return TRACKED_PLATFORMS.filter((p) => !p.isFree).sort(
    (a, b) => a.monthlyPrice - b.monthlyPrice
  );
}

/** Get free platforms */
export function getFreePlatforms(): PlatformConfig[] {
  return TRACKED_PLATFORMS.filter((p) => p.isFree);
}
