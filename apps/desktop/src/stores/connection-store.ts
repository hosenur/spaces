import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ConnectionState, OpenCodeServer } from "./types";

async function waitForServer(port: number, maxAttempts = 10, delayMs = 300): Promise<boolean> {
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

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  servers: new Map(),
  currentSpacePath: null,
  isServerBooting: false,

  startAllServers: async () => {
    try {
      const result = await invoke<OpenCodeServer[]>("start_all_opencode_servers");
      const serverMap = new Map<string, number>();
      result.forEach((server) => {
        serverMap.set(server.path, server.port);
      });
      set({ servers: serverMap });
    } catch (err) {
      console.error("Failed to start opencode servers:", err);
    }
  },

  setCurrentSpace: async (path: string | null) => {
    const { servers } = get();
    set({ currentSpacePath: path });

    if (path && !servers.has(path)) {
      set({ isServerBooting: true });
      try {
        const server = await invoke<OpenCodeServer>("start_opencode_server", { path });
        const isReady = await waitForServer(server.port);
        
        if (isReady) {
          set((state) => ({
            servers: new Map(state.servers).set(server.path, server.port),
            isServerBooting: false,
          }));
        } else {
          // Server failed to start - don't register the port
          console.error("Server failed to become ready on port:", server.port);
          set({ isServerBooting: false });
        }
      } catch (err) {
        console.error("Failed to start opencode server:", err);
        set({ isServerBooting: false });
      }
    }
  },

  getPort: (spacePath: string) => {
    return get().servers.get(spacePath);
  },

  removeServer: (spacePath: string) => {
    set((state) => {
      const newServers = new Map(state.servers);
      newServers.delete(spacePath);
      return { 
        servers: newServers,
        currentSpacePath: state.currentSpacePath === spacePath ? null : state.currentSpacePath,
      };
    });
  },
}));
