import { useEffect } from "react";
import type { Session } from "@opencode-ai/sdk";
import { useChatStore, useSessionStore } from "@/stores";

interface SSEEvent {
  type: string;
  properties: {
    info?: Session;
    part?: { sessionID: string };
    sessionID?: string;
    status?: { type: string };
  };
}

interface UseSpaceEventsOptions {
  port?: number;
  spacePath?: string | null;
}

export function useSpaceEvents({ port, spacePath }: UseSpaceEventsOptions) {
  const setIsAssistantTyping = useChatStore((state) => state.setIsAssistantTyping);
  const { upsertSession, removeSession } = useSessionStore();

  useEffect(() => {
    if (!port || !spacePath) return;

    let isActive = true;

    const updateTyping = (sessionId: string | undefined, typing: boolean) => {
      if (!sessionId) return;
      setIsAssistantTyping(spacePath, sessionId, typing);
    };

    const url = `http://127.0.0.1:${port}/event?directory=${encodeURIComponent(spacePath)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      if (!isActive) return;
      try {
        const data: SSEEvent = JSON.parse(event.data);
        const eventType = data.type;
        const properties = data.properties;

        if (!eventType) return;

        if (eventType === "message.part.updated") {
          updateTyping(properties?.part?.sessionID, true);
        } else if (eventType === "session.updated" || eventType === "session.created") {
          const sessionInfo = properties?.info;
          if (sessionInfo?.id) {
            upsertSession(spacePath, sessionInfo);
          }
        } else if (eventType === "session.deleted") {
          const sessionInfo = properties?.info;
          if (sessionInfo?.id) {
            removeSession(spacePath, sessionInfo.id);
          }
        } else if (eventType === "session.status") {
          const status = properties?.status?.type;
          if (status === "idle" || status === "completed") {
            updateTyping(properties?.sessionID, false);
          } else if (status === "running" || status === "pending") {
            updateTyping(properties?.sessionID, true);
          }
        } else if (eventType === "session.idle") {
          updateTyping(properties?.sessionID, false);
        }
      } catch {
        // Ignore parse errors.
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
    };

    return () => {
      isActive = false;
      eventSource.close();
    };
  }, [port, spacePath, setIsAssistantTyping, upsertSession, removeSession]);
}
