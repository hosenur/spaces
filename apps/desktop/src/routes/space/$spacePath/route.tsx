import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useConnectionStore, useSessionStore } from "@/stores";
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
    
    // Check if server is already running in the store
    const existingPort = useConnectionStore.getState().getPort(spacePath);
    if (existingPort) {
      return { spacePath, port: existingPort };
    }

    // Start the server and wait for it to be ready
    const server = await invoke<OpenCodeServer>("start_opencode_server", { path: spacePath });
    const isReady = await waitForServerReady(server.port);
    
    if (!isReady) {
      throw new Error(`Failed to start server for space: ${spacePath}`);
    }

    // Update the store with the new server
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
  const { fetchSessions } = useSessionStore();

  // Keep store in sync when navigating between spaces
  useEffect(() => {
    setCurrentSpace(spacePath);
  }, [spacePath, setCurrentSpace]);

  // Fetch sessions when route loads (port is guaranteed available from beforeLoad)
  useEffect(() => {
    fetchSessions(port, spacePath);
  }, [port, spacePath, fetchSessions]);

  return <Outlet />;
}
