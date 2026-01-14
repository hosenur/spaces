import { useEffect, type ReactNode } from "react";
import { useConnectionStore, useSessionStore, useConfigStore } from "@/stores";
import { ApiKeyModal } from "@/components/api-key-modal";

interface StoreInitializerProps {
  children: ReactNode;
}

export function StoreInitializer({ children }: StoreInitializerProps) {
  const { startAllServers, currentSpacePath, getPort } = useConnectionStore();
  const { fetchSessions } = useSessionStore();
  const { fetchConfig } = useConfigStore();

  // Load config on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Start all servers on mount
  useEffect(() => {
    startAllServers();
  }, [startAllServers]);

  // Fetch sessions when space changes
  useEffect(() => {
    if (currentSpacePath) {
      const port = getPort(currentSpacePath);
      if (port) {
        fetchSessions(port, currentSpacePath);
      }
    }
  }, [currentSpacePath, getPort, fetchSessions]);

  return (
    <>
      {children}
      <ApiKeyModal />
    </>
  );
}
