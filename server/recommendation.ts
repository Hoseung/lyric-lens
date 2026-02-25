import OpenAI from "openai";
import { storage } from "./storage";
import { searchBraveLyrics, searchBraveYoutube } from "./brave-search";
import type { Song, SeedSong } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface LLMRecommendation {
  title: string;
  artist: string;
  reason: string;
  lyric_style_summary: string;
  lyric_excerpt: string;
}

interface PlaylistContext {
  song: Song;
  likeReason: string | null;
  lyricAnalysis: string | null;
}

function buildUserPrompt(context: {
  preferences?: string | null;
  seedSongs: SeedSong[];
  playlistContext: PlaylistContext[];
  alreadyRecommended: string[];
}): string {
  let prompt = `Generate exactly 5 song recommendations based on the user's taste.\n\n`;

  // Add user preferences if provided
  if (context.preferences) {
    prompt += `USER'S LYRICAL PREFERENCES:\n${context.preferences}\n\n`;
  }

  // Add seed songs if provided (for initial guidance)
  if (context.seedSongs.length > 0) {
    prompt += `SEED SONGS (user-provided starting points - use these to understand their taste):\n`;
    prompt += context.seedSongs.map(s => `- ${s.artist} - ${s.title}`).join('\n');
    prompt += `\n\n`;
  }

  // Add playlist with reasons (most recent 30 songs)
  if (context.playlistContext.length > 0) {
    prompt += `SONGS THE USER HAS LIKED:\n`;
    const recentSongs = context.playlistContext.slice(0, 30);
    prompt += recentSongs.map(item => {
      let entry = `- ${item.song.artist} - ${item.song.title}`;
      if (item.lyricAnalysis) {
        entry += `\n  Lyric analysis: ${item.lyricAnalysis}`;
      } else if (item.song.lyricSummary) {
        entry += `\n  Lyric style: ${item.song.lyricSummary}`;
      }
      if (item.likeReason) {
        entry += `\n  User's note: ${item.likeReason}`;
      }
      return entry;
    }).join('\n');
    prompt += `\n\n`;
  } else if (context.seedSongs.length === 0 && !context.preferences) {
    prompt += `This is the first recommendation. Start with a diverse selection of Korean songs known for exceptional lyrics.\n\n`;
  }

  // Add exclusion list
  if (context.alreadyRecommended.length > 0) {
    prompt += `Songs already recommended (DO NOT recommend these again):\n`;
    prompt += context.alreadyRecommended.slice(-50).map(k => `- ${k}`).join('\n');
    prompt += `\n\n`;
  }

  prompt += `Rules:
- Recommend exactly 5 songs
- Each must be a REAL song by a REAL artist
- CAREFULLY study the lyric analyses of previously liked songs — identify recurring patterns in imagery, emotional tone, themes, and poetic style
- Use these patterns to find songs with genuinely similar lyrical DNA, not just the same genre or artist
- Consider the user's stated preferences and personal notes as well
- Prioritize Korean songs with beautiful lyrics
- Mix well-known and lesser-known artists
- Avoid repeating any previously recommended songs
- For lyric_excerpt: provide 2-4 actual representative lines from the song's lyrics in the original language
- For lyric_style_summary: describe the lyric texture/feel in Korean (2-3 sentences)

Respond in this exact JSON format:
{
  "recommendations": [
    {
      "title": "song title",
      "artist": "artist name",
      "reason": "why this song fits the user's taste (in Korean)",
      "lyric_style_summary": "description of lyric texture and feel (in Korean)",
      "lyric_excerpt": "2-4 representative lines from the actual lyrics"
    }
  ]
}`;

  return prompt;
}

export async function generateRecommendations(roundId: number, sessionId?: string): Promise<void> {
  try {
    // Get session data if sessionId provided
    let preferences: string | null = null;
    let seedSongs: SeedSong[] = [];
    let playlistContext: PlaylistContext[] = [];

    if (sessionId) {
      const session = await storage.getSession(sessionId);
      if (session) {
        preferences = session.preferences;
      }
      seedSongs = await storage.getSeedSongs(sessionId);
      playlistContext = await storage.getPlaylistWithReasons(sessionId);
    } else {
      // Fallback for legacy behavior (no session)
      const playlistItems = await storage.getPlaylist();
      playlistContext = playlistItems.map(p => ({
        song: p.song,
        likeReason: p.likeReason ?? null,
      }));
    }

    const alreadyRecommended = await storage.getAllRecommendedSongKeys(sessionId);

    const systemPrompt = `You are a Korean music curator specializing in songs with exceptional lyrics.
Your expertise is in finding songs where the lyrics have literary quality, emotional depth, and distinctive texture.

You focus on these lyric qualities:
- Living language (everyday words used poetically)
- Interpretive space (lyrics that invite personal meaning)
- Emotional temperature (warmth, coolness, intimacy)
- Contemplative depth (philosophical or introspective quality)
- Imagery (vivid, sensory descriptions)

You recommend songs primarily in Korean, but can include other languages if the lyrics are outstanding.
Always recommend REAL songs by REAL artists. Never invent fictional songs.`;

    const userPrompt = buildUserPrompt({
      preferences,
      seedSongs,
      playlistContext,
      alreadyRecommended,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_completion_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      await storage.updateRoundStatus(roundId, "failed");
      return;
    }

    let parsed: { recommendations: LLMRecommendation[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      await storage.updateRoundStatus(roundId, "failed");
      return;
    }

    if (!parsed.recommendations || parsed.recommendations.length === 0) {
      await storage.updateRoundStatus(roundId, "failed");
      return;
    }

    const searchPromises = parsed.recommendations.map(async (rec, index) => {
      const normalizedKey = `${rec.artist.toLowerCase().trim()}-${rec.title.toLowerCase().trim()}`;

      const [lyricResult, youtubeResult] = await Promise.allSettled([
        searchBraveLyrics(rec.artist, rec.title),
        searchBraveYoutube(rec.artist, rec.title),
      ]);

      const lyricUrl = lyricResult.status === "fulfilled" ? lyricResult.value : null;
      const youtubeUrl = youtubeResult.status === "fulfilled" ? youtubeResult.value : null;

      const song = await storage.findOrCreateSong({
        title: rec.title,
        artist: rec.artist,
        normalizedKey,
        youtubeUrl,
        lyricSourceUrl: lyricUrl,
        lyricExcerpt: rec.lyric_excerpt || null,
        lyricSummary: rec.lyric_style_summary || null,
      });

      await storage.addRecommendationItem({
        roundId,
        songId: song.id,
        rank: index + 1,
        whyRecommended: rec.reason,
        lyricStyleSummary: rec.lyric_style_summary,
      });
    });

    await Promise.all(searchPromises);
    await storage.updateRoundStatus(roundId, "ready");
  } catch (error) {
    console.error("Recommendation generation failed:", error);
    await storage.updateRoundStatus(roundId, "failed");
  }
}

export async function analyzeLyricsForPlaylistItems(
  playlistItemIds: Array<{ playlistItemId: number; song: Song }>
): Promise<void> {
  if (playlistItemIds.length === 0) return;

  const songsInfo = playlistItemIds.map(item =>
    `[ID:${item.playlistItemId}] ${item.song.artist} - ${item.song.title}` +
    (item.song.lyricExcerpt ? `\nLyric excerpt: ${item.song.lyricExcerpt}` : '') +
    (item.song.lyricSummary ? `\nExisting summary: ${item.song.lyricSummary}` : '')
  ).join('\n\n');

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `You are a Korean lyrics analyst. For each song provided, produce a concise but insightful analysis of its lyric characteristics. Focus on:
- Dominant imagery and sensory palette (visual, tactile, temporal)
- Emotional register and temperature (warm/cool, intimate/distant, raw/restrained)
- Thematic concerns (love, solitude, memory, urban life, nature, existential, etc.)
- Poetic devices (metaphor density, conversational vs. literary tone, repetition patterns)
- Unique signature (what makes THIS song's lyrics distinctive)

Write each analysis in Korean, 2-4 sentences. Be specific — avoid generic descriptions.
Respond in JSON format with an array of objects containing "id" (the playlist item ID) and "analysis" (the Korean text).`
        },
        {
          role: "user",
          content: `Analyze the lyric characteristics of these songs:\n\n${songsInfo}\n\nRespond as: { "analyses": [{ "id": <playlistItemId>, "analysis": "..." }] }`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_completion_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return;

    const parsed = JSON.parse(content) as { analyses: Array<{ id: number; analysis: string }> };
    if (!parsed.analyses) return;

    for (const item of parsed.analyses) {
      if (item.id && item.analysis) {
        await storage.updatePlaylistItemAnalysis(item.id, item.analysis);
      }
    }
  } catch (error) {
    console.error("Lyric analysis failed:", error);
  }
}
