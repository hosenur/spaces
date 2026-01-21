import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useConnectionStore, useSessionStore } from "@/stores";
import { useSpaceEvents } from "@/hooks/use-space-events";
import { decodeSpacePath } from "@/lib/space-path";
import type { OpenCodeServer } from "@/stores/types";

async function waitForServerReady(port: number, maxAttempts = 10, delayMs = 300): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/session`, { method: "GET" });
      if (response.ok) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return false;
}

export interface SpaceRouteContext {
  spacePath: string;
  port: number;
}

export const Route = createFileRoute("/space/$spacePath")({
  beforeLoad: async ({ params }) => {
    const spacePath = decodeSpacePath(params.spacePath);
    
    const existingPort = useConnectionStore.getState().getPort(spacePath);
    if (existingPort) {
      return { spacePath, port: existingPort };
    }

    const server = await invoke<OpenCodeServer>("start_opencode_server", { path: spacePath });
    const isReady = await waitForServerReady(server.port);
    
    if (!isReady) {
      throw new Error(`Failed to start server for space: ${spacePath}`);
    }

    useConnectionStore.setState((state) => ({
      servers: new Map(state.servers).set(server.path, server.port),
      currentSpacePath: spacePath,
    }));

    return { spacePath, port: server.port };
  },
  component: SpaceLayout,
});

function SpaceLayout() {
  const { spacePath, port } = Route.useRouteContext();
  const { setCurrentSpace } = useConnectionStore();
  const { fetchSessions, getSpaceSessions } = useSessionStore();
  const { hasFetched } = getSpaceSessions(spacePath);

  useSpaceEvents({ port, spacePath });

  useEffect(() => {
    setCurrentSpace(spacePath);
  }, [spacePath, setCurrentSpace]);

  useEffect(() => {
    if (!hasFetched) {
      fetchSessions(port, spacePath);
    }
  }, [port, spacePath, fetchSessions, hasFetched]);

  return <Outlet />;
}
