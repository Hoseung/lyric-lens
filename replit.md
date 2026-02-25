# Lyric Lens

A lyrics-based playlist curation web service powered by AI. Users discover songs by reading lyric excerpts and style summaries, selecting what resonates with them to build a personalized playlist.

## Architecture

- **Frontend**: React (Vite) with Tailwind CSS + shadcn/ui components
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Drizzle ORM)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2 for recommendations)
- **Search**: Brave Search API for lyric source URLs and YouTube links
- **Playback**: YouTube iframe embed player
- **GitHub**: Repo at https://github.com/Hoseung/lyric-lens (pushed via Octokit API)

## Core Loop

1. User optionally enters lyric preferences and seed songs
2. A session is created to persist their discovery context
3. AI generates 5 song recommendations with lyric excerpts
4. User sees cards with lyric snippets and style summaries
5. User selects songs they like
6. Optional: user adds notes on why they liked each song
7. Selected songs are added to playlist, one auto-plays via YouTube
8. **LLM auto-analyzes** selected songs' lyric characteristics (imagery, emotional register, themes, poetic devices) and stores annotations on each playlist item
9. Next 5 recommendations prefetched using enriched context (lyric analyses + preferences + like reasons)
10. The AI studies lyric analysis patterns across liked songs to find songs with similar lyrical DNA
11. Sessions persist — user can load previous sessions anytime

## Key Files

- `shared/schema.ts` - Database schema (sessions, seed_songs, songs, recommendation_rounds, recommendation_items, playlist_items)
- `server/routes.ts` - API endpoints
- `server/recommendation.ts` - LLM recommendation engine with session-aware context
- `server/brave-search.ts` - Brave Search integration for lyrics/YouTube URLs
- `server/storage.ts` - Database storage layer
- `server/db.ts` - Database connection
- `server/github.ts` - GitHub Octokit helper (utility, not runtime)
- `client/src/pages/home.tsx` - Main page with session state management
- `client/src/components/welcome-screen.tsx` - Landing screen with session setup
- `client/src/components/session-setup.tsx` - Preferences and seed songs form
- `client/src/components/session-manager.tsx` - Sheet for loading/managing saved sessions
- `client/src/components/like-reason-modal.tsx` - Optional modal for adding like reasons
- `client/src/components/recommendation-cards.tsx` - Song recommendation cards with lyrics
- `client/src/components/youtube-player.tsx` - YouTube embedded player
- `client/src/components/playlist-panel.tsx` - Cumulative playlist sidebar

## API Endpoints

- `POST /api/sessions` - Create new session with preferences and seed songs
- `GET /api/sessions` - List all saved sessions
- `GET /api/sessions/:sessionId` - Get session details with seed songs
- `PATCH /api/sessions/:sessionId` - Update session name/preferences
- `DELETE /api/sessions/:sessionId` - Delete session and all associated data
- `POST /api/recommendations/next` - Start generating next 5 recommendations (accepts sessionId)
- `GET /api/recommendations/:roundId` - Poll for round status/items
- `POST /api/recommendations/:roundId/select` - Submit selection with optional likeReasons and sessionId
- `GET /api/playlist` - Get playlist items (accepts ?sessionId= filter)
- `DELETE /api/playlist/:id` - Remove from playlist

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (auto-set)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI via Replit AI Integrations (auto-set)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (auto-set)
- `BRAVE_SEARCH_API_KEY` - Brave Search API key for lyric/YouTube searches
