import { db } from "./db";
import { eq, desc, inArray, and, not } from "drizzle-orm";
import {
  songs, recommendationRounds, recommendationItems, playlistItems,
  type Song, type InsertSong, type RecommendationRound,
  type RecommendationItem, type RecommendationItemWithSong,
  type PlaylistItem, type PlaylistItemWithSong, type InsertPlaylistItem,
} from "@shared/schema";

export interface IStorage {
  findOrCreateSong(data: InsertSong): Promise<Song>;
  getSong(id: number): Promise<Song | undefined>;

  createRound(): Promise<RecommendationRound>;
  getRound(id: number): Promise<RecommendationRound | undefined>;
  updateRoundStatus(id: number, status: string): Promise<void>;

  addRecommendationItem(data: {
    roundId: number;
    songId: number;
    rank: number;
    whyRecommended?: string;
    lyricStyleSummary?: string;
  }): Promise<RecommendationItem>;
  getRoundItems(roundId: number): Promise<RecommendationItemWithSong[]>;
  markItemsSelected(roundId: number, songIds: number[]): Promise<void>;

  addToPlaylist(data: InsertPlaylistItem): Promise<PlaylistItem>;
  getPlaylist(): Promise<PlaylistItemWithSong[]>;
  removeFromPlaylist(id: number): Promise<void>;

  getPlaylistSongIds(): Promise<number[]>;
  getAllRecommendedSongKeys(): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  async findOrCreateSong(data: InsertSong): Promise<Song> {
    const existing = await db.select().from(songs).where(eq(songs.normalizedKey, data.normalizedKey)).limit(1);
    if (existing.length > 0) {
      if (data.youtubeUrl || data.lyricSourceUrl || data.lyricSummary) {
        await db.update(songs).set({
          ...(data.youtubeUrl && { youtubeUrl: data.youtubeUrl }),
          ...(data.lyricSourceUrl && { lyricSourceUrl: data.lyricSourceUrl }),
          ...(data.lyricSummary && { lyricSummary: data.lyricSummary }),
          ...(data.lyricExcerpt && { lyricExcerpt: data.lyricExcerpt }),
        }).where(eq(songs.id, existing[0].id));
        const [updated] = await db.select().from(songs).where(eq(songs.id, existing[0].id));
        return updated;
      }
      return existing[0];
    }
    const [song] = await db.insert(songs).values(data).returning();
    return song;
  }

  async getSong(id: number): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song;
  }

  async createRound(): Promise<RecommendationRound> {
    const [round] = await db.insert(recommendationRounds).values({ status: "pending" }).returning();
    return round;
  }

  async getRound(id: number): Promise<RecommendationRound | undefined> {
    const [round] = await db.select().from(recommendationRounds).where(eq(recommendationRounds.id, id));
    return round;
  }

  async updateRoundStatus(id: number, status: string): Promise<void> {
    await db.update(recommendationRounds).set({ status }).where(eq(recommendationRounds.id, id));
  }

  async addRecommendationItem(data: {
    roundId: number;
    songId: number;
    rank: number;
    whyRecommended?: string;
    lyricStyleSummary?: string;
  }): Promise<RecommendationItem> {
    const [item] = await db.insert(recommendationItems).values({
      roundId: data.roundId,
      songId: data.songId,
      rank: data.rank,
      whyRecommended: data.whyRecommended || null,
      lyricStyleSummary: data.lyricStyleSummary || null,
      isSelected: false,
    }).returning();
    return item;
  }

  async getRoundItems(roundId: number): Promise<RecommendationItemWithSong[]> {
    const items = await db.select().from(recommendationItems)
      .where(eq(recommendationItems.roundId, roundId))
      .orderBy(recommendationItems.rank);

    const result: RecommendationItemWithSong[] = [];
    for (const item of items) {
      const [song] = await db.select().from(songs).where(eq(songs.id, item.songId));
      if (song) {
        result.push({ ...item, song });
      }
    }
    return result;
  }

  async markItemsSelected(roundId: number, songIds: number[]): Promise<void> {
    if (songIds.length === 0) return;
    await db.update(recommendationItems)
      .set({ isSelected: true })
      .where(and(
        eq(recommendationItems.roundId, roundId),
        inArray(recommendationItems.songId, songIds)
      ));
  }

  async addToPlaylist(data: InsertPlaylistItem): Promise<PlaylistItem> {
    const [item] = await db.insert(playlistItems).values(data).returning();
    return item;
  }

  async getPlaylist(): Promise<PlaylistItemWithSong[]> {
    const items = await db.select().from(playlistItems).orderBy(desc(playlistItems.selectedAt));
    const result: PlaylistItemWithSong[] = [];
    for (const item of items) {
      const [song] = await db.select().from(songs).where(eq(songs.id, item.songId));
      if (song) {
        result.push({ ...item, song });
      }
    }
    return result;
  }

  async removeFromPlaylist(id: number): Promise<void> {
    await db.delete(playlistItems).where(eq(playlistItems.id, id));
  }

  async getPlaylistSongIds(): Promise<number[]> {
    const items = await db.select({ songId: playlistItems.songId }).from(playlistItems);
    return items.map(i => i.songId);
  }

  async getAllRecommendedSongKeys(): Promise<string[]> {
    const allItems = await db.select({ songId: recommendationItems.songId }).from(recommendationItems);
    const songIds = allItems.map(i => i.songId);
    if (songIds.length === 0) return [];
    const allSongs = await db.select({ normalizedKey: songs.normalizedKey }).from(songs).where(inArray(songs.id, songIds));
    return allSongs.map(s => s.normalizedKey);
  }
}

export const storage = new DatabaseStorage();
