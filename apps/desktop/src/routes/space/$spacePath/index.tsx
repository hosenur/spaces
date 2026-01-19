import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useSessionStore } from "@/stores";
import { Loader } from "@/components/ui/loader";
import type { SpaceRouteContext } from "./route";

export const Route = createFileRoute("/space/$spacePath/")({
  component: SpaceIndex,
});

function SpaceIndex() {
  const { spacePath: encodedPath } = Route.useParams();
  const navigate = useNavigate();
  const { spacePath, port } = Route.useRouteContext() as SpaceRouteContext;
  const { getSpaceSessions, createSession } = useSessionStore();
  const { sessions, isLoading: isLoadingSessions, hasFetched, error } = getSpaceSessions(spacePath);
  const isCreatingSession = useRef(false);

  // Reset the ref when space changes
  useEffect(() => {
    isCreatingSession.current = false;
  }, [spacePath]);

  // When sessions are loaded, either navigate to latest or create new
  useEffect(() => {
    if (isLoadingSessions || !hasFetched || error) return;

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
          params: { spacePath: encodedPath, sessionId: latestSession.id },
          replace: true,
        });
      }
      return;
    }

    if (isCreatingSession.current) return;
    isCreatingSession.current = true;
    createSession(port, spacePath)
      .then((session) => {
        if (session) {
          navigate({
            to: "/space/$spacePath/session/$sessionId",
            params: { spacePath: encodedPath, sessionId: session.id },
            replace: true,
          });
        }
      })
      .finally(() => {
        isCreatingSession.current = false;
      });
  }, [
    isLoadingSessions,
    hasFetched,
    error,
    sessions,
    encodedPath,
    spacePath,
    port,
    navigate,
    createSession,
  ]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <Loader className="size-6" />
    </div>
  );
}
