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

// ─── Users ───────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
  status: text("status"),
  voteAverage: real("vote_average"),
  voteCount: integer("vote_count"),
  popularity: real("popularity"),
  numberOfSeasons: integer("number_of_seasons"),
  numberOfEpisodes: integer("number_of_episodes"),
  episodeRunTime: integer("episode_run_time"), // average minutes per episode
  genres: text("genres"),
  networks: text("networks"),
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
    monetizationType: text("monetization_type").notNull().default("flatrate"),
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

// ─── Watchlist (per user) ───────────────────────────────────
export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
  (table) => [
    uniqueIndex("watchlist_user_series_unique").on(table.userId, table.seriesId),
  ]
);

// ─── User Subscriptions (current state) ─────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  platformId: uuid("platform_id")
    .notNull()
    .references(() => platforms.id, { onDelete: "cascade" }),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  tier: text("tier").default("standard"),
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

// ─── Rotation Plans (per user) ──────────────────────────────
export const rotationPlans = pgTable("rotation_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  platformId: uuid("platform_id")
    .notNull()
    .references(() => platforms.id, { onDelete: "cascade" }),
  isRecommended: boolean("is_recommended").notNull().default(false),
  isConfirmed: boolean("is_confirmed").notNull().default(false),
  estimatedCost: real("estimated_cost"),
  reason: text("reason"),
  seriesCount: integer("series_count").default(0),
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

// ─── User Settings (per user, key-value) ────────────────────
export const settings = pgTable(
  "settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("settings_user_key_unique").on(table.userId, table.key),
  ]
);
