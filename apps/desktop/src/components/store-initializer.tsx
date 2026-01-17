import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useConnectionStore, useSessionStore, useConfigStore, useAuthStore } from "@/stores";
import { ApiKeyModal } from "@/components/api-key-modal";

interface StoreInitializerProps {
  children: ReactNode;
}

export function StoreInitializer({ children }: StoreInitializerProps) {
  const { startAllServers, currentSpacePath, getPort } = useConnectionStore();
  const { fetchSessions } = useSessionStore();
  const { fetchConfig } = useConfigStore();
  const { initialize, isInitialized, user } = useAuthStore();
  const navigate = useNavigate();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isInitialized && !user) {
      navigate({ to: "/login" });
    }
  }, [isInitialized, user, navigate]);

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

  // Show loading while auth is initializing
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-fg">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {children}
      <ApiKeyModal />
    </>
  );
}
