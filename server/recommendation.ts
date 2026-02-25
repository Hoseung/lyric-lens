import OpenAI from "openai";
import { storage } from "./storage";
import { searchBraveLyrics, searchBraveYoutube } from "./brave-search";
import type { Song } from "@shared/schema";

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

export async function generateRecommendations(roundId: number): Promise<void> {
  try {
    const playlistItems = await storage.getPlaylist();
    const likedSongs = playlistItems.map(p => `${p.song.artist} - ${p.song.title}`);
    const alreadyRecommended = await storage.getAllRecommendedSongKeys();

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

    const userPrompt = `Generate exactly 5 song recommendations based on the user's taste.

${likedSongs.length > 0 ? `Songs the user has liked:\n${likedSongs.slice(-20).map(s => `- ${s}`).join('\n')}` : 'This is the first recommendation. Start with a diverse selection of Korean songs known for exceptional lyrics.'}

${alreadyRecommended.length > 0 ? `\nSongs already recommended (DO NOT recommend these again):\n${alreadyRecommended.slice(-50).map(k => `- ${k}`).join('\n')}` : ''}

Rules:
- Recommend exactly 5 songs
- Each must be a REAL song by a REAL artist
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
