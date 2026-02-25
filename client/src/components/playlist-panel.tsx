import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ListMusic, Play, Trash2, Music2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { PlaylistItemWithSong, Song } from "@shared/schema";

interface PlaylistPanelProps {
  items: PlaylistItemWithSong[];
  onPlay: (song: Song) => void;
  onRemove: (playlistItemId: number) => void;
  currentSongId?: number;
}

export function PlaylistPanel({ items, onPlay, onRemove, currentSongId }: PlaylistPanelProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l bg-card/50 flex flex-col" data-testid="playlist-panel">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <ListMusic className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold">My Playlist</h2>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{items.length} songs</span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center min-h-[200px] lg:min-h-0">
          <Music2 className="w-8 h-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Your playlist is empty</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Pick songs from the recommendations to add them here
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 max-h-[300px] lg:max-h-none">
          <div className="p-2 space-y-1">
            {items.map((item) => {
              const isPlaying = item.song.id === currentSongId;
              const isExpanded = expandedId === item.id;
              const hasAnalysis = !!item.lyricAnalysis;

              return (
                <div
                  key={item.id}
                  className={`rounded-md transition-colors ${
                    isPlaying
                      ? "bg-primary/10 dark:bg-primary/15"
                      : "hover-elevate"
                  }`}
                  data-testid={`playlist-item-${item.id}`}
                >
                  <div className="group flex items-center gap-2 px-3 py-2">
                    <button
                      onClick={() => onPlay(item.song)}
                      className="flex-1 min-w-0 text-left"
                      data-testid={`button-play-${item.id}`}
                    >
                      <div className="flex items-center gap-2">
                        {isPlaying && (
                          <span className="flex-shrink-0">
                            <Play className="w-3 h-3 text-primary fill-primary" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className={`text-xs font-medium truncate ${isPlaying ? "text-primary" : ""}`}>
                            {item.song.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {item.song.artist}
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {hasAnalysis && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => toggleExpand(item.id, e)}
                          data-testid={`button-analysis-${item.id}`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-primary" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-primary/60" />
                          )}
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                        onClick={() => onRemove(item.id)}
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                  {isExpanded && hasAnalysis && (
                    <div className="px-3 pb-2.5" data-testid={`analysis-${item.id}`}>
                      <div className="text-[11px] leading-relaxed text-muted-foreground bg-muted/50 rounded px-2.5 py-2 border border-border/50">
                        {item.lyricAnalysis}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
