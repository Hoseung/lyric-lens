import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ListMusic, Play, Trash2, Music2 } from "lucide-react";
import type { PlaylistItemWithSong, Song } from "@shared/schema";

interface PlaylistPanelProps {
  items: PlaylistItemWithSong[];
  onPlay: (song: Song) => void;
  onRemove: (playlistItemId: number) => void;
  currentSongId?: number;
}

export function PlaylistPanel({ items, onPlay, onRemove, currentSongId }: PlaylistPanelProps) {
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
              return (
                <div
                  key={item.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                    isPlaying
                      ? "bg-primary/10 dark:bg-primary/15"
                      : "hover-elevate"
                  }`}
                  data-testid={`playlist-item-${item.id}`}
                >
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
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={() => onRemove(item.id)}
                    data-testid={`button-remove-${item.id}`}
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
