import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateRecommendations } from "./recommendation";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/recommendations/next", async (_req, res) => {
    try {
      const round = await storage.createRound();
      generateRecommendations(round.id).catch(err => {
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
      const { selectedSongIds } = req.body;

      if (!Array.isArray(selectedSongIds)) {
        return res.status(400).json({ error: "selectedSongIds must be an array" });
      }

      if (selectedSongIds.length > 0) {
        await storage.markItemsSelected(roundId, selectedSongIds);

        for (const songId of selectedSongIds) {
          await storage.addToPlaylist({ songId, roundId });
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

      const nextRound = await storage.createRound();
      generateRecommendations(nextRound.id).catch(err => {
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

  app.get("/api/playlist", async (_req, res) => {
    try {
      const playlist = await storage.getPlaylist();
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
