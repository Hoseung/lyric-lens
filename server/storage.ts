import { db } from "./db";
import { eq, desc, inArray, and, sql } from "drizzle-orm";
import {
  songs, recommendationRounds, recommendationItems, playlistItems,
  sessions, seedSongs,
  type Song, type InsertSong, type RecommendationRound,
  type RecommendationItem, type RecommendationItemWithSong,
  type PlaylistItem, type PlaylistItemWithSong, type InsertPlaylistItem,
  type Session, type InsertSession, type SeedSong, type InsertSeedSong,
} from "@shared/schema";

export interface IStorage {
  // Session management
  createSession(data: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  updateSession(id: string, data: Partial<InsertSession>): Promise<Session>;
  listSessions(): Promise<Session[]>;
  deleteSession(id: string): Promise<void>;

  // Seed songs
  addSeedSong(data: InsertSeedSong): Promise<SeedSong>;
  getSeedSongs(sessionId: string): Promise<SeedSong[]>;
  removeSeedSong(id: number): Promise<void>;

  // Songs
  findOrCreateSong(data: InsertSong): Promise<Song>;
  getSong(id: number): Promise<Song | undefined>;

  // Recommendation rounds
  createRound(sessionId?: string): Promise<RecommendationRound>;
  getRound(id: number): Promise<RecommendationRound | undefined>;
  updateRoundStatus(id: number, status: string): Promise<void>;

  // Recommendation items
  addRecommendationItem(data: {
    roundId: number;
    songId: number;
    rank: number;
    whyRecommended?: string;
    lyricStyleSummary?: string;
  }): Promise<RecommendationItem>;
  getRoundItems(roundId: number): Promise<RecommendationItemWithSong[]>;
  markItemsSelected(roundId: number, songIds: number[]): Promise<void>;

  // Playlist
  addToPlaylist(data: InsertPlaylistItem): Promise<PlaylistItem>;
  getPlaylist(sessionId?: string): Promise<PlaylistItemWithSong[]>;
  removeFromPlaylist(id: number): Promise<void>;

  // Helpers
  getPlaylistSongIds(sessionId?: string): Promise<number[]>;
  getAllRecommendedSongKeys(sessionId?: string): Promise<string[]>;
  getPlaylistWithReasons(sessionId: string): Promise<Array<{
    song: Song;
    likeReason: string | null;
    lyricAnalysis: string | null;
  }>>;
  updatePlaylistItemAnalysis(id: number, lyricAnalysis: string): Promise<void>;
  getPlaylistItemsWithoutAnalysis(sessionId?: string): Promise<Array<{
    playlistItemId: number;
    song: Song;
  }>>;
}

export class DatabaseStorage implements IStorage {
  // Session management
  async createSession(data: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(data).returning();
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async updateSession(id: string, data: Partial<InsertSession>): Promise<Session> {
    const [session] = await db.update(sessions)
      .set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(sessions.id, id))
      .returning();
    return session;
  }

  async listSessions(): Promise<Session[]> {
    return db.select().from(sessions).orderBy(desc(sessions.updatedAt));
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  // Seed songs
  async addSeedSong(data: InsertSeedSong): Promise<SeedSong> {
    const [seedSong] = await db.insert(seedSongs).values(data).returning();
    return seedSong;
  }

  async getSeedSongs(sessionId: string): Promise<SeedSong[]> {
    return db.select().from(seedSongs).where(eq(seedSongs.sessionId, sessionId));
  }

  async removeSeedSong(id: number): Promise<void> {
    await db.delete(seedSongs).where(eq(seedSongs.id, id));
  }

  // Songs
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

  // Recommendation rounds
  async createRound(sessionId?: string): Promise<RecommendationRound> {
    const [round] = await db.insert(recommendationRounds).values({
      status: "pending",
      sessionId: sessionId || null,
    }).returning();
    return round;
  }

  async getRound(id: number): Promise<RecommendationRound | undefined> {
    const [round] = await db.select().from(recommendationRounds).where(eq(recommendationRounds.id, id));
    return round;
  }

  async updateRoundStatus(id: number, status: string): Promise<void> {
    await db.update(recommendationRounds).set({ status }).where(eq(recommendationRounds.id, id));
  }

  // Recommendation items
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

  // Playlist
  async addToPlaylist(data: InsertPlaylistItem): Promise<PlaylistItem> {
    const [item] = await db.insert(playlistItems).values(data).returning();
    return item;
  }

  async getPlaylist(sessionId?: string): Promise<PlaylistItemWithSong[]> {
    let query = db.select().from(playlistItems);
    if (sessionId) {
      query = query.where(eq(playlistItems.sessionId, sessionId)) as typeof query;
    }
    const items = await query.orderBy(desc(playlistItems.selectedAt));

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

  // Helpers
  async getPlaylistSongIds(sessionId?: string): Promise<number[]> {
    let query = db.select({ songId: playlistItems.songId }).from(playlistItems);
    if (sessionId) {
      query = query.where(eq(playlistItems.sessionId, sessionId)) as typeof query;
    }
    const items = await query;
    return items.map(i => i.songId);
  }

  async getAllRecommendedSongKeys(sessionId?: string): Promise<string[]> {
    let query;
    if (sessionId) {
      // Get song IDs from recommendation items in rounds belonging to this session
      const roundsInSession = await db.select({ id: recommendationRounds.id })
        .from(recommendationRounds)
        .where(eq(recommendationRounds.sessionId, sessionId));
      const roundIds = roundsInSession.map(r => r.id);
      if (roundIds.length === 0) return [];

      const allItems = await db.select({ songId: recommendationItems.songId })
        .from(recommendationItems)
        .where(inArray(recommendationItems.roundId, roundIds));
      const songIds = allItems.map(i => i.songId);
      if (songIds.length === 0) return [];

      const allSongs = await db.select({ normalizedKey: songs.normalizedKey })
        .from(songs)
        .where(inArray(songs.id, songIds));
      return allSongs.map(s => s.normalizedKey);
    } else {
      const allItems = await db.select({ songId: recommendationItems.songId }).from(recommendationItems);
      const songIds = allItems.map(i => i.songId);
      if (songIds.length === 0) return [];
      const allSongs = await db.select({ normalizedKey: songs.normalizedKey }).from(songs).where(inArray(songs.id, songIds));
      return allSongs.map(s => s.normalizedKey);
    }
  }

  async getPlaylistWithReasons(sessionId: string): Promise<Array<{
    song: Song;
    likeReason: string | null;
    lyricAnalysis: string | null;
  }>> {
    const items = await db.select()
      .from(playlistItems)
      .where(eq(playlistItems.sessionId, sessionId))
      .orderBy(desc(playlistItems.selectedAt));

    const result: Array<{ song: Song; likeReason: string | null; lyricAnalysis: string | null }> = [];
    for (const item of items) {
      const [song] = await db.select().from(songs).where(eq(songs.id, item.songId));
      if (song) {
        result.push({
          song,
          likeReason: item.likeReason,
          lyricAnalysis: item.lyricAnalysis,
        });
      }
    }
    return result;
  }

  async updatePlaylistItemAnalysis(id: number, lyricAnalysis: string): Promise<void> {
    await db.update(playlistItems)
      .set({ lyricAnalysis })
      .where(eq(playlistItems.id, id));
  }

  async getPlaylistItemsWithoutAnalysis(sessionId?: string): Promise<Array<{
    playlistItemId: number;
    song: Song;
  }>> {
    let query = db.select().from(playlistItems);
    const conditions = [sql`${playlistItems.lyricAnalysis} IS NULL`];
    if (sessionId) {
      conditions.push(eq(playlistItems.sessionId, sessionId) as any);
    }
    const items = await query.where(and(...conditions));

    const result: Array<{ playlistItemId: number; song: Song }> = [];
    for (const item of items) {
      const [song] = await db.select().from(songs).where(eq(songs.id, item.songId));
      if (song) {
        result.push({ playlistItemId: item.id, song });
      }
    }
    return result;
  }
}

export const storage = new DatabaseStorage();
