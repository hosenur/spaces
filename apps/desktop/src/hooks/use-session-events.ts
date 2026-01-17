import useSWRSubscription from "swr/subscription";
import type { SWRSubscriptionOptions } from "swr/subscription";
import { useChatStore } from "@/stores";

interface SSEEvent {
  type: string;
  properties: {
    info?: { sessionID: string };
    part?: { sessionID: string };
    sessionID?: string;
    status?: { type: string };
  };
}

interface UseSessionEventsOptions {
  port: number;
  sessionId: string;
  spacePath: string;
}

export function useSessionEvents({ port, sessionId, spacePath }: UseSessionEventsOptions) {
  const { fetchMessages, setIsAssistantTyping } = useChatStore();

  const key = port && sessionId && spacePath 
    ? `sse:${port}:${sessionId}:${spacePath}` 
    : null;

  return useSWRSubscription(
    key,
    (_, { next }: SWRSubscriptionOptions<SSEEvent, Error>) => {
      const url = `http://127.0.0.1:${port}/event?directory=${encodeURIComponent(spacePath)}`;
      const eventSource = new EventSource(url);
      const fetchDelayMs = 150;
      let fetchTimer: ReturnType<typeof setTimeout> | null = null;
      let inFlight = false;
      let pending = false;

      const runFetch = () => {
        if (inFlight) {
          pending = true;
          return;
        }
        inFlight = true;
        fetchMessages(port, spacePath, sessionId)
          .catch(() => undefined)
          .finally(() => {
            inFlight = false;
            if (pending) {
              pending = false;
              scheduleFetch();
            }
          });
      };

      const scheduleFetch = () => {
        if (fetchTimer) return;
        fetchTimer = setTimeout(() => {
          fetchTimer = null;
          runFetch();
        }, fetchDelayMs);
      };
      
      // Check session status on connection to sync typing state
      fetch(`http://127.0.0.1:${port}/session/${sessionId}`)
        .then((res) => res.json())
        .then((session) => {
          // If session is idle, reset typing state
          const status = session?.status?.type;
          if (status === "idle" || status === "completed" || !status) {
            setIsAssistantTyping(spacePath, sessionId, false);
          } else {
            setIsAssistantTyping(spacePath, sessionId, true);
          }
        })
        .catch(() => {
          // On error, assume not typing
          setIsAssistantTyping(spacePath, sessionId, false);
        });

      eventSource.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);
          const eventType = data.type;
          const properties = data.properties;

          if (!eventType) return;

          if (eventType === "message.updated") {
            if (properties?.info?.sessionID === sessionId) {
              scheduleFetch();
              next(null, data);
            }
          } else if (eventType === "message.part.updated") {
            if (properties?.part?.sessionID === sessionId) {
              scheduleFetch();
              setIsAssistantTyping(spacePath, sessionId, true);
              next(null, data);
            }
          } else if (eventType === "session.status") {
            if (properties?.sessionID === sessionId) {
              const status = properties?.status?.type;
              if (status === "idle" || status === "completed") {
                setIsAssistantTyping(spacePath, sessionId, false);
              } else if (status === "running" || status === "pending") {
                setIsAssistantTyping(spacePath, sessionId, true);
              }
              next(null, data);
            }
          } else if (eventType === "session.idle") {
            if (properties?.sessionID === sessionId) {
              setIsAssistantTyping(spacePath, sessionId, false);
              next(null, data);
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = () => {
        console.error("SSE connection error");
        setIsAssistantTyping(spacePath, sessionId, false);
        next(new Error("SSE connection error"));
      };

      // Cleanup function - called when key changes or component unmounts
      return () => {
        if (fetchTimer) {
          clearTimeout(fetchTimer);
        }
        eventSource.close();
      };
    }
  );
}
