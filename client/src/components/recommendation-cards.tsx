import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Check, SkipForward, RefreshCw, ExternalLink, Quote, Sparkles, AlertCircle } from "lucide-react";
import type { RecommendationItemWithSong } from "@shared/schema";

interface RecommendationCardsProps {
  items: RecommendationItemWithSong[];
  selectedSongIds: Set<number>;
  onToggleSong: (songId: number) => void;
  onConfirm: () => void;
  onSkip: () => void;
  onRetry: () => void;
  status: "idle" | "pending" | "ready" | "failed";
  isSubmitting: boolean;
}

function SkeletonCard() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-5 h-5 rounded mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="ml-8 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="ml-8">
        <Skeleton className="h-3 w-2/3" />
      </div>
    </Card>
  );
}

export function RecommendationCards({
  items,
  selectedSongIds,
  onToggleSong,
  onConfirm,
  onSkip,
  onRetry,
  status,
  isSubmitting,
}: RecommendationCardsProps) {
  if (status === "pending" || status === "idle") {
    return (
      <div className="space-y-4" data-testid="recommendation-loading">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-muted-foreground">
            Finding songs with beautiful lyrics...
          </span>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4" data-testid="recommendation-error">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Could not generate recommendations. Please try again.
        </p>
        <Button variant="outline" onClick={onRetry} data-testid="button-retry">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="recommendation-cards">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            Pick the lyrics that speak to you
          </span>
        </div>
        {selectedSongIds.size > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedSongIds.size} selected
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const isSelected = selectedSongIds.has(item.song.id);
          return (
            <Card
              key={item.id}
              className={`p-4 cursor-pointer transition-all duration-200 hover-elevate ${
                isSelected
                  ? "ring-2 ring-primary/50 bg-primary/5 dark:bg-primary/10"
                  : ""
              }`}
              onClick={() => onToggleSong(item.song.id)}
              data-testid={`card-recommendation-${item.song.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5 flex-shrink-0">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSong(item.song.id)}
                    data-testid={`checkbox-song-${item.song.id}`}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <h3 className="font-medium text-sm leading-tight" data-testid={`text-title-${item.song.id}`}>
                      {item.song.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-artist-${item.song.id}`}>
                      {item.song.artist}
                    </p>
                  </div>

                  {item.song.lyricExcerpt && (
                    <div className="relative pl-3 border-l-2 border-primary/20">
                      <Quote className="w-3 h-3 text-primary/40 absolute -left-1.5 -top-0.5 bg-card" />
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line italic" data-testid={`text-excerpt-${item.song.id}`}>
                        {item.song.lyricExcerpt}
                      </p>
                    </div>
                  )}

                  {item.lyricStyleSummary && (
                    <p className="text-xs text-muted-foreground leading-relaxed" data-testid={`text-summary-${item.song.id}`}>
                      {item.lyricStyleSummary}
                    </p>
                  )}

                  {item.whyRecommended && (
                    <p className="text-xs text-muted-foreground/70">
                      {item.whyRecommended}
                    </p>
                  )}

                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    {item.song.lyricSourceUrl && (
                      <a
                        href={item.song.lyricSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary/70 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`link-lyrics-${item.song.id}`}
                      >
                        View full lyrics <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {item.song.youtubeUrl && (
                      <a
                        href={item.song.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`link-youtube-${item.song.id}`}
                      >
                        YouTube <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-2 flex-wrap">
        <Button
          onClick={onConfirm}
          disabled={isSubmitting}
          data-testid="button-confirm-selection"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              {selectedSongIds.size > 0
                ? `Add ${selectedSongIds.size} to Playlist`
                : "Confirm Selection"}
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onSkip}
          disabled={isSubmitting}
          data-testid="button-skip"
        >
          <SkipForward className="w-4 h-4 mr-2" />
          Skip All
        </Button>
      </div>
    </div>
  );
}
