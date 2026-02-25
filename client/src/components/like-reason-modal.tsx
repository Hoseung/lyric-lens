import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Song } from "@shared/schema";

interface LikeReasonModalProps {
  open: boolean;
  songs: Song[];
  onConfirm: (reasons: Record<number, string>) => void;
  onSkip: () => void;
}

export function LikeReasonModal({ open, songs, onConfirm, onSkip }: LikeReasonModalProps) {
  const [reasons, setReasons] = useState<Record<number, string>>({});

  const handleReasonChange = (songId: number, value: string) => {
    setReasons(prev => ({ ...prev, [songId]: value }));
  };

  const handleConfirm = () => {
    // Filter out empty reasons
    const filledReasons = Object.fromEntries(
      Object.entries(reasons).filter(([_, v]) => v.trim().length > 0)
    );
    onConfirm(filledReasons);
    setReasons({});
  };

  const handleSkip = () => {
    onSkip();
    setReasons({});
  };

  if (songs.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick notes (optional)</DialogTitle>
          <DialogDescription>
            What did you like about these songs? This helps find better recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4 max-h-[50vh] overflow-y-auto">
          {songs.map((song) => (
            <div key={song.id} className="space-y-2">
              <p className="text-sm font-medium">
                {song.artist} - {song.title}
              </p>
              <Input
                placeholder="e.g., love the imagery, relatable lyrics, beautiful melody with words..."
                value={reasons[song.id] || ""}
                onChange={(e) => handleReasonChange(song.id, e.target.value)}
                className="text-sm"
              />
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleSkip} className="w-full sm:w-auto">
            Skip
          </Button>
          <Button onClick={handleConfirm} className="w-full sm:w-auto">
            Save & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
