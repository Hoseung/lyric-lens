import { Button } from "@/components/ui/button";
import { Music2, Sparkles, Heart, ListMusic, FolderOpen } from "lucide-react";
import { SessionSetup, type SessionConfig } from "./session-setup";
import type { Session } from "@shared/schema";

interface WelcomeScreenProps {
  onStart: (config: SessionConfig) => void;
  onLoadSession: (sessionId: string) => void;
  sessions: Session[];
  isLoading: boolean;
}

export function WelcomeScreen({ onStart, onLoadSession, sessions, isLoading }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background" data-testid="welcome-screen">
      <div className="max-w-lg mx-auto px-6 py-8 space-y-8">
        <div className="text-center space-y-4">
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

        <div className="grid gap-3 text-left">
          <div className="flex items-start gap-3 p-3 rounded-md bg-card">
            <div className="mt-0.5">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">AI-Curated Recommendations</p>
              <p className="text-sm text-muted-foreground">5 songs at a time, chosen for their lyrical quality</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-md bg-card">
            <div className="mt-0.5">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Your Taste, Refined</p>
              <p className="text-sm text-muted-foreground">Every choice sharpens the next recommendation</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-md bg-card">
            <div className="mt-0.5">
              <ListMusic className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Sessions That Persist</p>
              <p className="text-sm text-muted-foreground">Save and load your discovery sessions anytime</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <SessionSetup onStart={onStart} isLoading={isLoading} />
        </div>

        {sessions.length > 0 && (
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Continue a previous session</span>
            </div>
            <div className="space-y-2">
              {sessions.slice(0, 3).map((session) => (
                <Button
                  key={session.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => onLoadSession(session.id)}
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {session.name || "Untitled Session"}
                    </p>
                    {session.preferences && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {session.preferences}
                      </p>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Powered by AI. Focused on Korean lyrics with literary depth.
        </p>
      </div>
    </div>
  );
}
