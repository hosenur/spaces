import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { useConnectionStore, useSessionStore } from "@/stores";
import { decodeSpacePath } from "@/lib/space-path";

export const Route = createFileRoute("/space/$spacePath")({
  component: SpaceLayout,
});

function SpaceLayout() {
  const { spacePath } = Route.useParams();
  const { setCurrentSpace, getPort } = useConnectionStore();
  const { fetchSessions } = useSessionStore();

  const decodedPath = decodeSpacePath(spacePath);
  const port = getPort(decodedPath);
  
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

  return <Outlet />;
}
