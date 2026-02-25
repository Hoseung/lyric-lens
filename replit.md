# Lyric Lens

A lyrics-based playlist curation web service powered by AI. Users discover songs by reading lyric excerpts and style summaries, selecting what resonates with them to build a personalized playlist.

## Architecture

- **Frontend**: React (Vite) with Tailwind CSS + shadcn/ui components
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Drizzle ORM)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.2 for recommendations)
- **Search**: Brave Search API for lyric source URLs and YouTube links
- **Playback**: YouTube iframe embed player

## Core Loop

1. AI generates 5 song recommendations with lyric excerpts
2. User sees cards with lyric snippets and style summaries
3. User selects songs they like
4. Selected songs are added to playlist
5. One selected song auto-plays via YouTube
6. Next 5 recommendations are prefetched in background
7. Repeat

## Key Files

- `shared/schema.ts` - Database schema (songs, recommendation_rounds, recommendation_items, playlist_items)
- `server/routes.ts` - API endpoints
- `server/recommendation.ts` - LLM recommendation engine
- `server/brave-search.ts` - Brave Search integration for lyrics/YouTube URLs
- `server/storage.ts` - Database storage layer
- `server/db.ts` - Database connection
- `client/src/pages/home.tsx` - Main page (single-page app)
- `client/src/components/welcome-screen.tsx` - Landing/start screen
- `client/src/components/recommendation-cards.tsx` - Song recommendation cards with lyrics
- `client/src/components/youtube-player.tsx` - YouTube embedded player
- `client/src/components/playlist-panel.tsx` - Cumulative playlist sidebar

## API Endpoints

- `POST /api/recommendations/next` - Start generating next 5 recommendations
- `GET /api/recommendations/:roundId` - Poll for round status/items
- `POST /api/recommendations/:roundId/select` - Submit selection, triggers next round
- `GET /api/playlist` - Get playlist items
- `DELETE /api/playlist/:id` - Remove from playlist

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (auto-set)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI via Replit AI Integrations (auto-set)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (auto-set)
- `BRAVE_SEARCH_API_KEY` - Brave Search API key for lyric/YouTube searches
