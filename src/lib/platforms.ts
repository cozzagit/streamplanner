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
  /** Direct URL to the platform's website / signup page */
  websiteUrl: string;
  /** Affiliate tracking URL — falls back to websiteUrl if empty */
  affiliateUrl?: string;
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
    websiteUrl: "https://www.netflix.com/it/",
  },
  {
    tmdbId: 119,
    name: "Amazon Prime Video",
    slug: "amazon-prime",
    color: "#00A8E1",
    monthlyPrice: 4.99,
    isFree: false,
    icon: "📦",
    websiteUrl: "https://www.amazon.it/prime",
    affiliateUrl: "https://www.amazon.it/prime?tag=streamplanner-21",
  },
  {
    tmdbId: 337,
    name: "Disney+",
    slug: "disney-plus",
    color: "#0063E5",
    monthlyPrice: 5.99,
    isFree: false,
    icon: "🏰",
    websiteUrl: "https://www.disneyplus.com/it-it",
  },
  {
    tmdbId: 350,
    name: "Apple TV+",
    slug: "apple-tv-plus",
    color: "#a3a3a3",
    monthlyPrice: 9.99,
    isFree: false,
    icon: "🍎",
    websiteUrl: "https://tv.apple.com/it",
  },
  {
    tmdbId: 531,
    name: "Paramount+",
    slug: "paramount-plus",
    color: "#0064FF",
    monthlyPrice: 7.99,
    isFree: false,
    icon: "⛰️",
    websiteUrl: "https://www.paramountplus.com/it/",
  },
  {
    tmdbId: 1796,
    name: "NOW",
    slug: "now-sky",
    color: "#00E054",
    monthlyPrice: 6.99,
    isFree: false,
    icon: "📺",
    websiteUrl: "https://www.nowtv.it/",
  },
  {
    tmdbId: 283,
    name: "Crunchyroll",
    slug: "crunchyroll",
    color: "#F47521",
    monthlyPrice: 4.99,
    isFree: false,
    icon: "🍥",
    websiteUrl: "https://www.crunchyroll.com/it",
  },
  {
    tmdbId: 584,
    name: "Discovery+",
    slug: "discovery-plus",
    color: "#003BE5",
    monthlyPrice: 3.99,
    isFree: false,
    icon: "🔍",
    websiteUrl: "https://www.discoveryplus.com/it",
  },
  {
    tmdbId: 11,
    name: "MUBI",
    slug: "mubi",
    color: "#001A22",
    monthlyPrice: 7.99,
    isFree: false,
    icon: "🎬",
    websiteUrl: "https://mubi.com/it",
  },
  {
    tmdbId: 222,
    name: "RaiPlay",
    slug: "raiplay",
    color: "#003CA6",
    monthlyPrice: 0,
    isFree: true,
    icon: "📡",
    websiteUrl: "https://www.raiplay.it/",
  },
  {
    tmdbId: 300,
    name: "Pluto TV",
    slug: "pluto-tv",
    color: "#2D2D2D",
    monthlyPrice: 0,
    isFree: true,
    icon: "🪐",
    websiteUrl: "https://pluto.tv/it/",
  },
  {
    tmdbId: 359,
    name: "Mediaset Infinity",
    slug: "mediaset-infinity",
    color: "#1428A0",
    monthlyPrice: 0,
    isFree: true,
    icon: "♾️",
    websiteUrl: "https://www.mediasetinfinity.mediaset.it/",
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

/** Get the best outbound URL for a platform (affiliate if available, otherwise website) */
export function getPlatformUrl(platform: PlatformConfig): string {
  return platform.affiliateUrl || platform.websiteUrl;
}
