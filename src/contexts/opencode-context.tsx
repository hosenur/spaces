import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Session {
  id: string;
  title?: string;
  time?: {
    created: number;
    updated: number;
  };
}

interface OpenCodeServer {
  path: string;
  port: number;
}

interface OpencodeContextValue {
  servers: Map<string, number>;
  sessions: Session[];
  currentSpacePath: string | null;
  isLoading: boolean;
  isServerBooting: boolean;
  error: string | null;
  setCurrentSpace: (path: string | null) => void;
  refreshSessions: () => Promise<void>;
  startAllServers: () => Promise<void>;
  createSession: () => Promise<Session | null>;
  getPort: (spacePath: string) => number | undefined;
}

const OpencodeContext = createContext<OpencodeContextValue | null>(null);

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

export function OpencodeProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<Map<string, number>>(new Map());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSpacePath, setCurrentSpacePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isServerBooting, setIsServerBooting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAllServers = useCallback(async () => {
    try {
      const result = await invoke<OpenCodeServer[]>("start_all_opencode_servers");
      const serverMap = new Map<string, number>();
      result.forEach((server) => {
        serverMap.set(server.path, server.port);
      });
      setServers(serverMap);
    } catch (err) {
      console.error("Failed to start opencode servers:", err);
    }
  }, []);

  // Start all servers on mount
  useEffect(() => {
    startAllServers();
  }, [startAllServers]);

  const refreshSessions = useCallback(async () => {
    if (!currentSpacePath) {
      setSessions([]);
      return;
    }
    
    const port = servers.get(currentSpacePath);
    if (!port) {
      setSessions([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://127.0.0.1:${port}/session`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`);
      }
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sessions");
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentSpacePath, servers]);

  useEffect(() => {
    if (currentSpacePath && servers.has(currentSpacePath)) {
      refreshSessions();
    } else {
      setSessions([]);
    }
  }, [currentSpacePath, servers, refreshSessions]);

  // Also start server for a new space when it's selected
  const handleSetCurrentSpace = useCallback(async (path: string | null) => {
    setCurrentSpacePath(path);
    
    if (path && !servers.has(path)) {
      setIsServerBooting(true);
      try {
        const server = await invoke<OpenCodeServer>("start_opencode_server", { path });
        await waitForServer(server.port);
        setServers((prev) => new Map(prev).set(server.path, server.port));
      } catch (err) {
        console.error("Failed to start opencode server:", err);
      } finally {
        setIsServerBooting(false);
      }
    }
  }, [servers]);

  const createSession = useCallback(async (): Promise<Session | null> => {
    if (!currentSpacePath) return null;
    
    const port = servers.get(currentSpacePath);
    if (!port) return null;
    
    try {
      const response = await fetch(`http://127.0.0.1:${port}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create session");
      }
      
      const session: Session = await response.json();
      setSessions((prev) => [session, ...prev]);
      return session;
    } catch (err) {
      console.error("Failed to create session:", err);
      return null;
    }
  }, [currentSpacePath, servers]);

  const getPort = useCallback((spacePath: string): number | undefined => {
    return servers.get(spacePath);
  }, [servers]);

  return (
    <OpencodeContext.Provider
      value={{
        servers,
        sessions,
        currentSpacePath,
        isLoading,
        isServerBooting,
        error,
        setCurrentSpace: handleSetCurrentSpace,
        refreshSessions,
        startAllServers,
        createSession,
        getPort,
      }}
    >
      {children}
    </OpencodeContext.Provider>
  );
}

export function useOpencode() {
  const context = useContext(OpencodeContext);
  if (!context) {
    throw new Error("useOpencode must be used within an OpencodeProvider");
  }
  return context;
}
