import { db } from "./index";
import { platforms, settings } from "./schema";

const PLATFORMS_DATA = [
  {
    tmdbProviderId: 8,
    name: "Netflix",
    slug: "netflix",
    monthlyPrice: 7.99,
    monthlyPriceStandard: 13.99,
    monthlyPricePremium: 19.99,
    isFree: false,
    color: "#E50914",
  },
  {
    tmdbProviderId: 119,
    name: "Amazon Prime Video",
    slug: "amazon-prime",
    monthlyPrice: 4.99,
    monthlyPriceStandard: 4.99,
    monthlyPricePremium: null,
    isFree: false,
    color: "#00A8E1",
  },
  {
    tmdbProviderId: 337,
    name: "Disney+",
    slug: "disney-plus",
    monthlyPrice: 5.99,
    monthlyPriceStandard: 8.99,
    monthlyPricePremium: 11.99,
    isFree: false,
    color: "#0063E5",
  },
  {
    tmdbProviderId: 350,
    name: "Apple TV+",
    slug: "apple-tv-plus",
    monthlyPrice: 9.99,
    monthlyPriceStandard: 9.99,
    monthlyPricePremium: null,
    isFree: false,
    color: "#000000",
  },
  {
    tmdbProviderId: 531,
    name: "Paramount+",
    slug: "paramount-plus",
    monthlyPrice: 7.99,
    monthlyPriceStandard: 7.99,
    monthlyPricePremium: null,
    isFree: false,
    color: "#0064FF",
  },
  {
    tmdbProviderId: 1796,
    name: "NOW",
    slug: "now-sky",
    monthlyPrice: 6.99,
    monthlyPriceStandard: 9.99,
    monthlyPricePremium: 14.99,
    isFree: false,
    color: "#00E054",
  },
  {
    tmdbProviderId: 283,
    name: "Crunchyroll",
    slug: "crunchyroll",
    monthlyPrice: 4.99,
    monthlyPriceStandard: 6.49,
    monthlyPricePremium: 7.99,
    isFree: false,
    color: "#F47521",
  },
  {
    tmdbProviderId: 584,
    name: "Discovery+",
    slug: "discovery-plus",
    monthlyPrice: 3.99,
    monthlyPriceStandard: 6.99,
    monthlyPricePremium: null,
    isFree: false,
    color: "#003BE5",
  },
  {
    tmdbProviderId: 11,
    name: "MUBI",
    slug: "mubi",
    monthlyPrice: 7.99,
    monthlyPriceStandard: 7.99,
    monthlyPricePremium: null,
    isFree: false,
    color: "#001A22",
  },
  {
    tmdbProviderId: 222,
    name: "RaiPlay",
    slug: "raiplay",
    monthlyPrice: 0,
    monthlyPriceStandard: null,
    monthlyPricePremium: null,
    isFree: true,
    color: "#003CA6",
  },
  {
    tmdbProviderId: 300,
    name: "Pluto TV",
    slug: "pluto-tv",
    monthlyPrice: 0,
    monthlyPriceStandard: null,
    monthlyPricePremium: null,
    isFree: true,
    color: "#2D2D2D",
  },
  {
    tmdbProviderId: 359,
    name: "Mediaset Infinity",
    slug: "mediaset-infinity",
    monthlyPrice: 0,
    monthlyPriceStandard: 3.99,
    monthlyPricePremium: null,
    isFree: true,
    color: "#1428A0",
  },
];

async function seed() {
  console.log("Seeding platforms...");

  for (const p of PLATFORMS_DATA) {
    await db
      .insert(platforms)
      .values(p)
      .onConflictDoNothing({ target: platforms.tmdbProviderId });
  }

  // Default settings
  await db
    .insert(settings)
    .values([
      { key: "monthly_budget", value: "15" },
      { key: "excluded_platforms", value: "[]" },
      { key: "always_on_platforms", value: "[]" },
      { key: "active_subscriptions", value: '["netflix","amazon-prime"]' },
    ])
    .onConflictDoNothing({ target: settings.key });

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
