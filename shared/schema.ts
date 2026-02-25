import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  normalizedKey: text("normalized_key").notNull().unique(),
  youtubeUrl: text("youtube_url"),
  lyricSourceUrl: text("lyric_source_url"),
  lyricExcerpt: text("lyric_excerpt"),
  lyricSummary: text("lyric_summary"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const recommendationRounds = pgTable("recommendation_rounds", {
  id: serial("id").primaryKey(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const recommendationItems = pgTable("recommendation_items", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").notNull().references(() => recommendationRounds.id, { onDelete: "cascade" }),
  songId: integer("song_id").notNull().references(() => songs.id),
  rank: integer("rank").notNull(),
  whyRecommended: text("why_recommended"),
  lyricStyleSummary: text("lyric_style_summary"),
  isSelected: boolean("is_selected").default(false).notNull(),
});

export const playlistItems = pgTable("playlist_items", {
  id: serial("id").primaryKey(),
  songId: integer("song_id").notNull().references(() => songs.id),
  selectedAt: timestamp("selected_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  roundId: integer("round_id").references(() => recommendationRounds.id),
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  createdAt: true,
});

export const insertRecommendationRoundSchema = createInsertSchema(recommendationRounds).omit({
  id: true,
  createdAt: true,
});

export const insertRecommendationItemSchema = createInsertSchema(recommendationItems).omit({
  id: true,
});

export const insertPlaylistItemSchema = createInsertSchema(playlistItems).omit({
  id: true,
  selectedAt: true,
});

export type Song = typeof songs.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type RecommendationRound = typeof recommendationRounds.$inferSelect;
export type RecommendationItem = typeof recommendationItems.$inferSelect;
export type PlaylistItem = typeof playlistItems.$inferSelect;
export type InsertPlaylistItem = z.infer<typeof insertPlaylistItemSchema>;

export type RecommendationItemWithSong = RecommendationItem & { song: Song };
export type PlaylistItemWithSong = PlaylistItem & { song: Song };
