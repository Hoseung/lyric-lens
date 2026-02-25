import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Music2, Play } from "lucide-react";
import type { Song } from "@shared/schema";

interface YouTubePlayerProps {
  song: Song;
}

function extractVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/watch\?.*v=([^&\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function YouTubePlayer({ song }: YouTubePlayerProps) {
  const videoId = useMemo(() => song.youtubeUrl ? extractVideoId(song.youtubeUrl) : null, [song.youtubeUrl]);
  const [showPlayer, setShowPlayer] = useState(true);

  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artist} ${song.title}`)}`;

  return (
    <div className="space-y-2" data-testid="youtube-player">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Play className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium truncate" data-testid="text-now-playing">
            {song.artist} - {song.title}
          </span>
        </div>
        <a
          href={song.youtubeUrl || searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0"
          data-testid="link-youtube"
        >
          YouTube <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {videoId && showPlayer ? (
        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={`${song.artist} - ${song.title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            data-testid="iframe-youtube"
          />
        </div>
      ) : (
        <Card className="flex items-center justify-center p-8 bg-card">
          <div className="text-center space-y-3">
            <Music2 className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {videoId ? "Player hidden" : "No video found"}
            </p>
            {!videoId && (
              <a
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" data-testid="button-search-youtube">
                  Search on YouTube <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
