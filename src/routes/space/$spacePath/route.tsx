import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useConnectionStore, useSessionStore } from "@/stores";
import { decodeSpacePath, encodeSpacePath } from "@/lib/space-path";

export const Route = createFileRoute("/space/$spacePath")({
  component: SpaceLayout,
});

function SpaceLayout() {
  const { spacePath } = Route.useParams();
  const navigate = useNavigate();
  const { setCurrentSpace, getPort, isServerBooting } = useConnectionStore();
  const { fetchSessions, getSpaceSessions, createSession } = useSessionStore();
  const isCreatingSession = useRef(false);

  const decodedPath = decodeSpacePath(spacePath);
  const port = getPort(decodedPath);
  
  // Get sessions for the current space only
  const { sessions, isLoading: isLoadingSessions } = getSpaceSessions(decodedPath);

  // Reset the ref when space changes
  useEffect(() => {
    isCreatingSession.current = false;
  }, [decodedPath]);

  // Set current space when route changes
  useEffect(() => {
    setCurrentSpace(decodedPath);
  }, [decodedPath, setCurrentSpace]);

  // Fetch sessions when port becomes available
  useEffect(() => {
    if (port) {
      fetchSessions(port, decodedPath);
    }
  }, [port, decodedPath, fetchSessions]);

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
    } else if (!isCreatingSession.current) {
      // No sessions exist, create one (but only once)
      isCreatingSession.current = true;
      createSession(port, decodedPath).then((session) => {
        if (session) {
          navigate({
            to: "/space/$spacePath/session/$sessionId",
            params: { spacePath: encodeSpacePath(decodedPath), sessionId: session.id },
            replace: true,
          });
        }
      });
    }
  }, [port, isServerBooting, isLoadingSessions, sessions, spacePath, decodedPath, navigate, createSession]);

  return <Outlet />;
}
