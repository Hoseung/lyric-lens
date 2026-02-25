import { Button } from "@/components/ui/button";
import { Music2, Sparkles, Heart, ListMusic } from "lucide-react";

interface WelcomeScreenProps {
  onStart: () => void;
  isLoading: boolean;
}

export function WelcomeScreen({ onStart, isLoading }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" data-testid="welcome-screen">
      <div className="max-w-lg mx-auto px-6 text-center space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-2">
            <Music2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Lyric Lens</h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Choose lyrics that resonate with you.
            <br />
            Build a playlist that speaks your language.
          </p>
        </div>

        <div className="grid gap-4 text-left">
          <div className="flex items-start gap-3 p-4 rounded-md bg-card">
            <div className="mt-0.5">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">AI-Curated Recommendations</p>
              <p className="text-sm text-muted-foreground">5 songs at a time, each chosen for their lyrical quality</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-md bg-card">
            <div className="mt-0.5">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Your Taste, Refined</p>
              <p className="text-sm text-muted-foreground">Every choice sharpens the next recommendation</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-md bg-card">
            <div className="mt-0.5">
              <ListMusic className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Playlist That Grows</p>
              <p className="text-sm text-muted-foreground">Songs you pick are saved and ready to play anytime</p>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          onClick={onStart}
          disabled={isLoading}
          className="px-8"
          data-testid="button-start"
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

        <p className="text-xs text-muted-foreground">
          Powered by AI. Focused on Korean lyrics with literary depth.
        </p>
      </div>
    </div>
  );
}
