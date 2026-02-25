import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Music, ChevronDown, ChevronUp } from "lucide-react";

export interface SessionConfig {
  sessionId: string;
  name?: string;
  preferences?: string;
  seedSongs?: Array<{ title: string; artist: string }>;
}

interface SessionSetupProps {
  onStart: (config: SessionConfig) => void;
  isLoading: boolean;
}

function parseSeedSongs(input: string): Array<{ title: string; artist: string }> {
  if (!input.trim()) return [];

  return input
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Try to parse "Artist - Title" format
      const separatorMatch = line.match(/^(.+?)\s*[-–—]\s*(.+)$/);
      if (separatorMatch) {
        return { artist: separatorMatch[1].trim(), title: separatorMatch[2].trim() };
      }
      // Fallback: treat whole line as title with unknown artist
      return { artist: "Unknown", title: line };
    })
    .filter(song => song.title.length > 0);
}

export function SessionSetup({ onStart, isLoading }: SessionSetupProps) {
  const [preferences, setPreferences] = useState("");
  const [seedSongsInput, setSeedSongsInput] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleStart = () => {
    const sessionId = crypto.randomUUID();
    const seedSongs = parseSeedSongs(seedSongsInput);

    onStart({
      sessionId,
      preferences: preferences.trim() || undefined,
      seedSongs: seedSongs.length > 0 ? seedSongs : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          What kind of lyrics do you enjoy? (optional)
        </label>
        <Textarea
          placeholder="e.g., I love melancholic lyrics about city life at night, songs with poetic imagery, or lyrics that feel like a conversation with an old friend..."
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          className="min-h-[100px] resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Describe your lyrical preferences to help find songs that match your taste faster.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showAdvanced ? "Hide" : "Show"} seed songs
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" />
              Seed songs (optional)
            </label>
            <Textarea
              placeholder={"IU - 밤편지\n10cm - 봄이 좋냐\nNell - 기억을 걷는 시간"}
              value={seedSongsInput}
              onChange={(e) => setSeedSongsInput(e.target.value)}
              className="min-h-[80px] resize-none font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Add songs you love to start with (one per line, format: Artist - Title).
            </p>
          </div>
        )}
      </div>

      <Button
        size="lg"
        onClick={handleStart}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2">
              <Sparkles className="w-4 h-4" />
            </span>
            Preparing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Start Discovering
          </>
        )}
      </Button>
    </div>
  );
}
