import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { FolderOpen, Plus, Trash2, Clock } from "lucide-react";
import type { Session } from "@shared/schema";

interface SessionManagerProps {
  currentSessionId: string | null;
  onLoadSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export function SessionManager({ currentSessionId, onLoadSession, onNewSession }: SessionManagerProps) {
  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await apiRequest("DELETE", `/api/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" title="Manage Sessions">
          <FolderOpen className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your Sessions</SheetTitle>
          <SheetDescription>
            Continue a previous discovery session or start fresh.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Button onClick={onNewSession} className="w-full" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Start New Session
          </Button>

          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No saved sessions yet. Start discovering to create one!
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group relative p-4 rounded-lg border transition-colors cursor-pointer hover:bg-accent ${
                    currentSessionId === session.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => onLoadSession(session.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {session.name || "Untitled Session"}
                      </p>
                      {session.preferences && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {session.preferences}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Clock className="w-3 h-3" />
                        {formatDate(session.updatedAt)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this session? This will remove all playlist items and history.")) {
                          deleteMutation.mutate(session.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  {currentSessionId === session.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
