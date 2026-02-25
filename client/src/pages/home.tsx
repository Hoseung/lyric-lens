import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { YouTubePlayer } from "@/components/youtube-player";
import { RecommendationCards } from "@/components/recommendation-cards";
import { PlaylistPanel } from "@/components/playlist-panel";
import { WelcomeScreen } from "@/components/welcome-screen";
import { SessionManager } from "@/components/session-manager";
import { LikeReasonModal } from "@/components/like-reason-modal";
import type { SessionConfig } from "@/components/session-setup";
import type { RecommendationItemWithSong, PlaylistItemWithSong, Song, Session } from "@shared/schema";
import { Music2 } from "lucide-react";

type RoundStatus = "idle" | "pending" | "ready" | "failed";

interface RoundData {
  roundId: number;
  status: string;
  items: RecommendationItemWithSong[];
}

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentRoundId, setCurrentRoundId] = useState<number | null>(null);
  const [roundStatus, setRoundStatus] = useState<RoundStatus>("idle");
  const [recommendations, setRecommendations] = useState<RecommendationItemWithSong[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<number>>(new Set());
  const [hasStarted, setHasStarted] = useState(false);
  const [showLikeReasonModal, setShowLikeReasonModal] = useState(false);
  const [pendingSelectedSongs, setPendingSelectedSongs] = useState<Song[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLLS = 60;

  // Fetch sessions for welcome screen
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  // Fetch playlist scoped to current session
  const { data: playlist = [], refetch: refetchPlaylist } = useQuery<PlaylistItemWithSong[]>({
    queryKey: ["/api/playlist", { sessionId: currentSessionId }],
    queryFn: async () => {
      const url = currentSessionId
        ? `/api/playlist?sessionId=${encodeURIComponent(currentSessionId)}`
        : "/api/playlist";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch playlist");
      return res.json();
    },
    enabled: hasStarted,
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (config: SessionConfig) => {
      const res = await apiRequest("POST", "/api/sessions", {
        id: config.sessionId,
        name: config.name,
        preferences: config.preferences,
        seedSongs: config.seedSongs,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });

  // Start round mutation
  const startRoundMutation = useMutation({
    mutationFn: async (sessionId?: string) => {
      const res = await apiRequest("POST", "/api/recommendations/next", {
        sessionId: sessionId || null,
      });
      return res.json();
    },
    onSuccess: (data: { roundId: number; status: string }) => {
      setCurrentRoundId(data.roundId);
      setRoundStatus("pending");
      setRecommendations([]);
      setSelectedSongIds(new Set());
      startPolling(data.roundId);
    },
  });

  // Select songs mutation
  const selectMutation = useMutation({
    mutationFn: async ({
      roundId,
      songIds,
      likeReasons,
      sessionId,
    }: {
      roundId: number;
      songIds: number[];
      likeReasons?: Record<number, string>;
      sessionId?: string | null;
    }) => {
      const res = await apiRequest("POST", `/api/recommendations/${roundId}/select`, {
        selectedSongIds: songIds,
        likeReasons,
        sessionId,
      });
      return res.json();
    },
    onSuccess: (data: {
      autoplaySong: Song | null;
      nextRound: { roundId: number; status: string };
      playlistUpdated: boolean;
    }) => {
      if (data.autoplaySong) {
        setCurrentSong(data.autoplaySong);
      }
      refetchPlaylist();
      setCurrentRoundId(data.nextRound.roundId);
      setRoundStatus("pending");
      setRecommendations([]);
      setSelectedSongIds(new Set());
      startPolling(data.nextRound.roundId);
    },
  });

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollCountRef.current = 0;
  }, []);

  const pollRound = useCallback(
    async (roundId: number) => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        stopPolling();
        setRoundStatus("failed");
        return;
      }

      try {
        const res = await fetch(`/api/recommendations/${roundId}`);
        if (!res.ok) return;
        const data: RoundData = await res.json();

        if (data.status === "ready") {
          setRoundStatus("ready");
          setRecommendations(data.items);
          stopPolling();
        } else if (data.status === "failed") {
          setRoundStatus("failed");
          stopPolling();
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    },
    [stopPolling]
  );

  const startPolling = useCallback(
    (roundId: number) => {
      stopPolling();
      pollingRef.current = setInterval(() => pollRound(roundId), 2000);
    },
    [pollRound, stopPolling]
  );

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Handle starting a new session
  const handleStart = (config: SessionConfig) => {
    setCurrentSessionId(config.sessionId);
    createSessionMutation.mutate(config, {
      onSuccess: () => {
        setHasStarted(true);
        startRoundMutation.mutate(config.sessionId);
      },
    });
  };

  // Handle loading an existing session
  const handleLoadSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setHasStarted(true);
    // Start a new round for this session
    startRoundMutation.mutate(sessionId);
  };

  // Handle starting a new session from the session manager
  const handleNewSession = () => {
    setCurrentSessionId(null);
    setHasStarted(false);
    setCurrentSong(null);
    setRecommendations([]);
    setSelectedSongIds(new Set());
    setRoundStatus("idle");
    stopPolling();
  };

  const handleToggleSong = (songId: number) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  };

  // When user confirms selection, show the like reason modal
  const handleConfirmSelection = () => {
    if (currentRoundId === null) return;

    if (selectedSongIds.size > 0) {
      // Get the selected songs
      const selectedSongs = recommendations
        .filter((item) => selectedSongIds.has(item.songId))
        .map((item) => item.song);
      setPendingSelectedSongs(selectedSongs);
      setShowLikeReasonModal(true);
    } else {
      // No songs selected, just skip
      submitSelection({});
    }
  };

  // Submit selection with optional reasons
  const submitSelection = (likeReasons: Record<number, string>) => {
    if (currentRoundId === null) return;
    selectMutation.mutate({
      roundId: currentRoundId,
      songIds: Array.from(selectedSongIds),
      likeReasons,
      sessionId: currentSessionId,
    });
    setShowLikeReasonModal(false);
    setPendingSelectedSongs([]);
  };

  const handleSkipReasons = () => {
    submitSelection({});
  };

  const handleSkip = () => {
    if (currentRoundId === null) return;
    selectMutation.mutate({
      roundId: currentRoundId,
      songIds: [],
      sessionId: currentSessionId,
    });
  };

  const handleRetry = () => {
    startRoundMutation.mutate(currentSessionId || undefined);
  };

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song);
  };

  const handleRemoveFromPlaylist = async (playlistItemId: number) => {
    await apiRequest("DELETE", `/api/playlist/${playlistItemId}`);
    refetchPlaylist();
  };

  if (!hasStarted) {
    return (
      <WelcomeScreen
        onStart={handleStart}
        onLoadSession={handleLoadSession}
        sessions={sessions}
        isLoading={createSessionMutation.isPending || startRoundMutation.isPending}
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background" data-testid="home-page">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-2 px-6 py-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <Music2 className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Lyric Lens</h1>
          <span className="text-sm text-muted-foreground ml-1">by lyrics, for you</span>
          <div className="ml-auto">
            <SessionManager
              currentSessionId={currentSessionId}
              onLoadSession={handleLoadSession}
              onNewSession={handleNewSession}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {currentSong && <YouTubePlayer song={currentSong} />}

            <RecommendationCards
              items={recommendations}
              selectedSongIds={selectedSongIds}
              onToggleSong={handleToggleSong}
              onConfirm={handleConfirmSelection}
              onSkip={handleSkip}
              onRetry={handleRetry}
              status={roundStatus}
              isSubmitting={selectMutation.isPending}
            />
          </div>
        </div>
      </div>

      <PlaylistPanel
        items={playlist}
        onPlay={handlePlaySong}
        onRemove={handleRemoveFromPlaylist}
        currentSongId={currentSong?.id}
      />

      <LikeReasonModal
        open={showLikeReasonModal}
        songs={pendingSelectedSongs}
        onConfirm={submitSelection}
        onSkip={handleSkipReasons}
      />
    </div>
  );
}
