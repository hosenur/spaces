import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useConnectionStore, useSessionStore } from "@/stores";
import { Loader } from "@/components/ui/loader";
import { decodeSpacePath } from "@/lib/space-path";

export const Route = createFileRoute("/space/$spacePath/")({
  component: SpaceIndex,
});

function SpaceIndex() {
  const { spacePath } = Route.useParams();
  const navigate = useNavigate();
  const decodedPath = decodeSpacePath(spacePath);
  const { currentSpacePath, isServerBooting, getPort } = useConnectionStore();
  const { getSpaceSessions, createSession } = useSessionStore();
  const { sessions, isLoading: isLoadingSessions } = getSpaceSessions(decodedPath);
  const isCreatingSession = useRef(false);
  const port = getPort(decodedPath);

  // Reset the ref when space changes
  useEffect(() => {
    isCreatingSession.current = false;
  }, [decodedPath]);

  // When server is ready and sessions are loaded, either navigate to latest or create new
  useEffect(() => {
    if (!port || isServerBooting || isLoadingSessions) return;

    if (sessions.length > 0) {
      // Sort by created time (descending) and get the latest
      const latestSession = [...sessions].sort((a, b) => {
        const timeA = a.time?.created ?? 0;
        const timeB = b.time?.created ?? 0;
        return timeB - timeA;
      })[0];

      if (latestSession) {
        navigate({
          to: "/space/$spacePath/session/$sessionId",
          params: { spacePath, sessionId: latestSession.id },
          replace: true,
        });
      }
      return;
    }

    if (isCreatingSession.current) return;
    isCreatingSession.current = true;
    createSession(port, decodedPath)
      .then((session) => {
        if (session) {
          navigate({
            to: "/space/$spacePath/session/$sessionId",
            params: { spacePath, sessionId: session.id },
            replace: true,
          });
        }
      })
      .finally(() => {
        isCreatingSession.current = false;
      });
  }, [
    port,
    isServerBooting,
    isLoadingSessions,
    sessions,
    spacePath,
    decodedPath,
    navigate,
    createSession,
  ]);

  if (!currentSpacePath || isServerBooting) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader className="size-6" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
    </div>
  );
}
