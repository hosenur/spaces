import { useEffect, type ReactNode } from "react";
import { useConfigStore } from "@/stores";
import { ApiKeyModal } from "@/components/api-key-modal";
import { UpdateChecker } from "@/components/update-checker";

interface StoreInitializerProps {
  children: ReactNode;
}

export function StoreInitializer({ children }: StoreInitializerProps) {
  const { fetchConfig } = useConfigStore();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <>
      {children}
      <ApiKeyModal />
      <UpdateChecker />
    </>
  );
}
