import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateRecommendations } from "./recommendation";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Session endpoints
  app.post("/api/sessions", async (req, res) => {
    try {
      const { id, name, preferences, seedSongs: seedSongsInput } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Session id is required" });
      }

      const session = await storage.createSession({ id, name, preferences });

      // Add seed songs if provided
      if (Array.isArray(seedSongsInput) && seedSongsInput.length > 0) {
        for (const seed of seedSongsInput) {
          if (seed.title && seed.artist) {
            await storage.addSeedSong({
              sessionId: session.id,
              title: seed.title,
              artist: seed.artist,
            });
          }
        }
      }

      const seedSongs = await storage.getSeedSongs(session.id);
      res.json({ ...session, seedSongs });
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/sessions", async (_req, res) => {
    try {
      const sessions = await storage.listSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error listing sessions:", error);
      res.status(500).json({ error: "Failed to list sessions" });
    }
  });

  app.get("/api/sessions/:sessionId", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const seedSongs = await storage.getSeedSongs(session.id);
      res.json({ ...session, seedSongs });
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.patch("/api/sessions/:sessionId", async (req, res) => {
    try {
      const { name, preferences } = req.body;
      const session = await storage.updateSession(req.params.sessionId, { name, preferences });
      const seedSongs = await storage.getSeedSongs(session.id);
      res.json({ ...session, seedSongs });
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:sessionId", async (req, res) => {
    try {
      await storage.deleteSession(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  // Recommendation endpoints
  app.post("/api/recommendations/next", async (req, res) => {
    try {
      const { sessionId } = req.body;
      const round = await storage.createRound(sessionId);
      generateRecommendations(round.id, sessionId).catch(err => {
        console.error("Background recommendation failed:", err);
      });
      res.json({ roundId: round.id, status: "pending" });
    } catch (error) {
      console.error("Error creating recommendation round:", error);
      res.status(500).json({ error: "Failed to start recommendations" });
    }
  });

  app.get("/api/recommendations/:roundId", async (req, res) => {
    try {
      const roundId = parseInt(req.params.roundId);
      const round = await storage.getRound(roundId);
      if (!round) {
        return res.status(404).json({ error: "Round not found" });
      }

      if (round.status === "pending") {
        return res.json({ roundId: round.id, status: "pending", items: [] });
      }

      if (round.status === "failed") {
        return res.json({ roundId: round.id, status: "failed", items: [] });
      }

      const items = await storage.getRoundItems(roundId);
      res.json({ roundId: round.id, status: round.status, items });
    } catch (error) {
      console.error("Error fetching round:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  app.post("/api/recommendations/:roundId/select", async (req, res) => {
    try {
      const roundId = parseInt(req.params.roundId);
      const { selectedSongIds, likeReasons, sessionId } = req.body;

      if (!Array.isArray(selectedSongIds)) {
        return res.status(400).json({ error: "selectedSongIds must be an array" });
      }

      if (selectedSongIds.length > 0) {
        await storage.markItemsSelected(roundId, selectedSongIds);

        for (const songId of selectedSongIds) {
          const likeReason = likeReasons?.[songId] || null;
          await storage.addToPlaylist({
            songId,
            roundId,
            sessionId: sessionId || null,
            likeReason,
          });
        }
      }

      await storage.updateRoundStatus(roundId, "consumed");

      let autoplaySong = null;
      if (selectedSongIds.length > 0) {
        const randomIndex = Math.floor(Math.random() * selectedSongIds.length);
        const song = await storage.getSong(selectedSongIds[randomIndex]);
        if (song) {
          autoplaySong = song;
        }
      }

      const nextRound = await storage.createRound(sessionId);
      generateRecommendations(nextRound.id, sessionId).catch(err => {
        console.error("Background prefetch failed:", err);
      });

      res.json({
        playlistUpdated: selectedSongIds.length > 0,
        autoplaySong,
        nextRound: { roundId: nextRound.id, status: "pending" },
      });
    } catch (error) {
      console.error("Error selecting songs:", error);
      res.status(500).json({ error: "Failed to process selection" });
    }
  });

  // Playlist endpoints
  app.get("/api/playlist", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string | undefined;
      const playlist = await storage.getPlaylist(sessionId);
      res.json(playlist);
    } catch (error) {
      console.error("Error fetching playlist:", error);
      res.status(500).json({ error: "Failed to fetch playlist" });
    }
  });

  app.delete("/api/playlist/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.removeFromPlaylist(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from playlist:", error);
      res.status(500).json({ error: "Failed to remove from playlist" });
    }
  });

  return httpServer;
}
