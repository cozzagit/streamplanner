import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  real,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Enums
export const watchStatusEnum = pgEnum("watch_status", [
  "to_watch",
  "watching",
  "completed",
  "dropped",
]);

export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "paused",
  "cancelled",
]);

// ─── Platforms ────────────────────────────────────────────────
export const platforms = pgTable("platforms", {
  id: uuid("id").primaryKey().defaultRandom(),
  tmdbProviderId: integer("tmdb_provider_id").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoPath: text("logo_path"),
  monthlyPrice: real("monthly_price"), // cheapest tier
  monthlyPriceStandard: real("monthly_price_standard"),
  monthlyPricePremium: real("monthly_price_premium"),
  isFree: boolean("is_free").notNull().default(false),
  color: text("color"), // brand color hex
  isTracked: boolean("is_tracked").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Series (cache from TMDB) ────────────────────────────────
export const series = pgTable("series", {
  id: uuid("id").primaryKey().defaultRandom(),
  tmdbId: integer("tmdb_id").notNull().unique(),
  name: text("name").notNull(),
  originalName: text("original_name"),
  overview: text("overview"),
  posterPath: text("poster_path"),
  backdropPath: text("backdrop_path"),
  firstAirDate: text("first_air_date"),
  lastAirDate: text("last_air_date"),
  status: text("status"), // Returning Series, Ended, etc.
  voteAverage: real("vote_average"),
  voteCount: integer("vote_count"),
  popularity: real("popularity"),
  numberOfSeasons: integer("number_of_seasons"),
  numberOfEpisodes: integer("number_of_episodes"),
  genres: text("genres"), // JSON string array
  networks: text("networks"), // JSON string array
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Series ↔ Platform availability ─────────────────────────
export const seriesPlatforms = pgTable(
  "series_platforms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platforms.id, { onDelete: "cascade" }),
    monetizationType: text("monetization_type").notNull().default("flatrate"), // flatrate, free, ads, rent, buy
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("series_platform_unique").on(
      table.seriesId,
      table.platformId,
      table.monetizationType
    ),
  ]
);

// ─── Watchlist ───────────────────────────────────────────────
export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    status: watchStatusEnum("status").notNull().default("to_watch"),
    priority: priorityEnum("priority").notNull().default("medium"),
    currentSeason: integer("current_season"),
    currentEpisode: integer("current_episode"),
    notes: text("notes"),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("watchlist_series_unique").on(table.seriesId)]
);

// ─── User Subscriptions (current state) ─────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  platformId: uuid("platform_id")
    .notNull()
    .references(() => platforms.id, { onDelete: "cascade" }),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  tier: text("tier").default("standard"), // cheapest, standard, premium
  monthlyCost: real("monthly_cost"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Rotation Plans ──────────────────────────────────────────
export const rotationPlans = pgTable("rotation_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  platformId: uuid("platform_id")
    .notNull()
    .references(() => platforms.id, { onDelete: "cascade" }),
  isRecommended: boolean("is_recommended").notNull().default(false),
  isConfirmed: boolean("is_confirmed").notNull().default(false),
  estimatedCost: real("estimated_cost"),
  reason: text("reason"), // why this platform this month
  seriesCount: integer("series_count").default(0), // how many watchlist series available
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Upcoming Episodes (cache) ───────────────────────────────
export const upcomingEpisodes = pgTable("upcoming_episodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  seriesId: uuid("series_id")
    .notNull()
    .references(() => series.id, { onDelete: "cascade" }),
  seasonNumber: integer("season_number").notNull(),
  episodeNumber: integer("episode_number").notNull(),
  name: text("name"),
  airDate: text("air_date"),
  overview: text("overview"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Monthly Budget Settings ─────────────────────────────────
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
