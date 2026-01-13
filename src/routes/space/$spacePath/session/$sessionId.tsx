import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { useOpencode } from "@/contexts/opencode-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bouncy } from "ldrs/react";
import "ldrs/react/Bouncy.css";
import { Streamdown } from "streamdown";
import { AgentSelector } from "@/components/agent-selector";
import { ModelSelector, type ModelOption } from "@/components/model-selector";

interface MessagePart {
  id: string;
  type: string;
  text?: string;
  tool?: string;
  state?: {
    status?: string;
    input?: Record<string, unknown>;
    output?: string;
  };
  [key: string]: unknown;
}

interface Message {
  id: string;
  sessionID: string;
  role: "user" | "assistant";
  time: { created: number };
  agent?: string;
}

interface MessageWithParts {
  info: Message;
  parts: MessagePart[];
}

export const Route = createFileRoute("/space/$spacePath/session/$sessionId")({
  component: SessionChat,
});

function SessionChat() {
  const { spacePath, sessionId } = Route.useParams();
  const { servers, currentSpacePath } = useOpencode();
  const [messages, setMessages] = useState<MessageWithParts[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Agent and model state
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(null);

  const decodedPath = decodeURIComponent(atob(spacePath));
  const port = servers.get(decodedPath);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!port) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/session/${sessionId}/message`
      );
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      const validMessages: MessageWithParts[] = [];
      for (const msg of data) {
        if (
          msg &&
          msg.info &&
          msg.info.id &&
          msg.info.role &&
          Array.isArray(msg.parts)
        ) {
          validMessages.push(msg);
        }
      }
      setMessages(validMessages);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch messages"
      );
    } finally {
      setIsLoading(false);
    }
  }, [port, sessionId]);

  // Connect to SSE for real-time updates
  useEffect(() => {
    if (!port) return;

    fetchMessages();

    const eventSource = new EventSource(
      `http://127.0.0.1:${port}/event?directory=${encodeURIComponent(decodedPath)}`
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = data.type;
        const properties = data.properties;

        if (!eventType) return;

        if (eventType === "message.updated") {
          if (properties?.info?.sessionID === sessionId) {
            fetchMessages();
          }
        } else if (eventType === "message.part.updated") {
          const part = properties?.part;
          if (part?.sessionID === sessionId) {
            fetchMessages();
            setIsAssistantTyping(true);
          }
        } else if (eventType === "session.status") {
          if (properties?.sessionID === sessionId) {
            const status = properties?.status?.type;
            if (status === "idle" || status === "completed") {
              setIsAssistantTyping(false);
            } else if (status === "running" || status === "pending") {
              setIsAssistantTyping(true);
            }
          }
        } else if (eventType === "session.idle") {
          if (properties?.sessionID === sessionId) {
            setIsAssistantTyping(false);
          }
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [port, sessionId, decodedPath, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend() {
    if (!input.trim() || !port || isSending) return;

    const messageText = input.trim();
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/session/${sessionId}/prompt_async`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parts: [{ type: "text", text: messageText }],
            agent: selectedAgent || undefined,
            model: selectedModel
              ? {
                  modelID: selectedModel.modelId,
                  providerID: selectedModel.providerId,
                }
              : undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setInput(messageText);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function renderPart(part: MessagePart): React.ReactNode {
    switch (part.type) {
      case "text":
        if (typeof part.text === "string" && part.text.trim()) {
          return <Streamdown>{part.text}</Streamdown>;
        }
        return null;

      case "reasoning":
        if (typeof part.text === "string" && part.text.trim()) {
          return (
            <div className="text-muted-fg italic">
              <Streamdown>{part.text}</Streamdown>
            </div>
          );
        }
        return null;

      case "tool":
        const toolName = part.tool || "Unknown tool";
        const status = part.state?.status || "pending";
        const toolInput = part.state?.input;
        return (
          <div className="bg-secondary/50 rounded px-3 py-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{toolName}</span>
              <span
                className={`text-xs ${status === "completed" ? "text-green-600" : status === "error" ? "text-red-600" : "text-yellow-600"}`}
              >
                [{status}]
              </span>
            </div>
            {toolInput && Object.keys(toolInput).length > 0 && (
              <div className="mt-1 text-muted-fg truncate">
                {JSON.stringify(toolInput).slice(0, 100)}...
              </div>
            )}
          </div>
        );

      case "step-start":
      case "step-finish":
      case "snapshot":
      case "patch":
      case "agent":
      case "retry":
      case "compaction":
        return null;

      default:
        return null;
    }
  }

  function renderMessage(msg: MessageWithParts): React.ReactNode {
    const renderedParts = msg.parts
      .map((part, index) => {
        const rendered = renderPart(part);
        if (!rendered) return null;
        return (
          <div key={part.id || index} className="mb-2 last:mb-0">
            {rendered}
          </div>
        );
      })
      .filter(Boolean);

    if (renderedParts.length === 0) {
      return null;
    }

    return <>{renderedParts}</>;
  }

  if (!currentSpacePath || !port) {
    return (
      <div className="flex items-center justify-center h-full text-muted-fg">
        Connecting to space...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4">
        {isLoading ? (
          <div className="text-center text-muted-fg">Loading messages...</div>
        ) : error ? (
          <div className="text-center text-danger">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-fg py-12">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="divide-y divide-dashed divide-border">
            {messages.map((msg) => {
              const content = renderMessage(msg);
              if (!content) return null;
              return (
                <div key={msg.info.id} className="p-4">
                  <div className="text-xs text-muted-fg mb-1 font-medium">
                    {msg.info.role === "user" ? "You" : "Assistant"}
                  </div>
                  <div className="text-sm">{content}</div>
                </div>
              );
            })}
          </div>
        )}
        {isAssistantTyping && (
          <div className="p-4">
            <div className="text-xs text-muted-fg mb-1 font-medium">
              Assistant
            </div>
            <Bouncy size="25" speed="1.75" color="currentColor" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t space-y-3 px-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          className="min-h-[60px] max-h-[200px] resize-none"
          disabled={isSending || isAssistantTyping}
        />

        {/* Controls row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AgentSelector
              port={port}
              value={selectedAgent}
              onChange={setSelectedAgent}
            />
            <ModelSelector
              port={port}
              value={selectedModel}
              onChange={setSelectedModel}
            />
          </div>

          <Button
            onPress={handleSend}
            isDisabled={!input.trim() || isSending || isAssistantTyping}
          >
            {isSending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
