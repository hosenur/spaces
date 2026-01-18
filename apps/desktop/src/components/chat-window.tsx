import { useEffect, useRef, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bouncy } from "ldrs/react";
import "ldrs/react/Bouncy.css";
import { AgentSelector } from "@/components/agent-selector";
import { ModelSelector } from "@/components/model-selector";
import { TextPart, ReasoningPart, ToolPart } from "@/components/messages";
import { useChatStore, useAgentStore, useModelStore, useConfigStore } from "@/stores";
import { useSessionEvents } from "@/hooks/use-session-events";
import { generateBranchName } from "@/lib/branch-generator";
import type {
  Part,
  TextPart as TextPartType,
  ReasoningPart as ReasoningPartType,
  ToolPart as ToolPartType,
} from "@opencode-ai/sdk";

const DEFAULT_SESSION_STATE = {
  messages: [] as { info: { id: string; role: string }; parts: Part[] }[],
  isLoading: true,
  isSending: false,
  isAssistantTyping: false,
  error: null as string | null,
  input: "",
};

interface ChatWindowProps {
  port: number;
  sessionId: string;
  spacePath: string;
}

export function ChatWindow({ port, sessionId, spacePath }: ChatWindowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Select session state directly from the space/session record for proper reactivity
  const messages = useChatStore((state) => state.spaces[spacePath]?.sessions[sessionId]?.messages ?? DEFAULT_SESSION_STATE.messages);
  const isLoading = useChatStore((state) => state.spaces[spacePath]?.sessions[sessionId]?.isLoading ?? DEFAULT_SESSION_STATE.isLoading);
  const isSending = useChatStore((state) => state.spaces[spacePath]?.sessions[sessionId]?.isSending ?? DEFAULT_SESSION_STATE.isSending);
  const isAssistantTyping = useChatStore((state) => state.spaces[spacePath]?.sessions[sessionId]?.isAssistantTyping ?? DEFAULT_SESSION_STATE.isAssistantTyping);
  const error = useChatStore((state) => state.spaces[spacePath]?.sessions[sessionId]?.error ?? DEFAULT_SESSION_STATE.error);
  const input = useChatStore((state) => state.spaces[spacePath]?.sessions[sessionId]?.input ?? DEFAULT_SESSION_STATE.input);

  const fetchMessages = useChatStore((state) => state.fetchMessages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const setInput = useChatStore((state) => state.setInput);

  const { selectedAgent, fetchAgents } = useAgentStore();
  const { selectedModel, fetchModels } = useModelStore();
  const { config, getSpaceConfig, setSpaceBranchName } = useConfigStore();

  // SSE subscription via SWR - handles cleanup automatically
  useSessionEvents({ port, sessionId, spacePath });

  // Scroll to bottom immediately on session/space switch (before paint)
  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [sessionId, spacePath]);

  // Scroll to bottom when loading completes
  useLayoutEffect(() => {
    if (!isLoading && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [isLoading]);

  // Scroll to bottom smoothly when new messages arrive or typing indicator appears
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAssistantTyping]);

  // Initialize data on mount
  useEffect(() => {
    if (!port) return;
    fetchMessages(port, spacePath, sessionId);
    fetchAgents(port);
    fetchModels(port);
  }, [port, spacePath, sessionId]);

  async function handleSend() {
    if (!input.trim() || !port || isSending) return;

    const messageText = input.trim();
    const model = selectedModel
      ? { modelID: selectedModel.modelId, providerID: selectedModel.providerId }
      : undefined;

    // Check if this is the first message (no messages yet) and we have an API key
    // spacePath is already the decoded path (e.g., /Users/...)
    const hasUserMessage = messages.some((msg) => msg.info.role === "user");
    const spaceConfig = getSpaceConfig(spacePath);
    const shouldGenerateBranchName = !hasUserMessage && config?.groq_api_key && !spaceConfig?.branch_name;

    const ok = await sendMessage(port, spacePath, sessionId, messageText, selectedAgent, model);
    if (ok) {
      fetchMessages(port, spacePath, sessionId);
    }

    // Generate branch name in background after sending the message
    if (shouldGenerateBranchName && config?.groq_api_key) {
      generateBranchName(config.groq_api_key, messageText)
        .then((branchName) => {
          setSpaceBranchName(spacePath, branchName);
        })
        .catch((err) => {
          console.error("Failed to generate branch name:", err);
        });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function renderPart(part: Part): React.ReactNode {
    switch (part.type) {
      case "text":
        return <TextPart part={part as TextPartType} />;
      case "reasoning":
        return <ReasoningPart part={part as ReasoningPartType} />;
      case "tool":
        return <ToolPart part={part as ToolPartType} />;
      default:
        return null;
    }
  }

  function renderMessage(msg: { info: { id: string; role: string }; parts: Part[] }): React.ReactNode {
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

    if (renderedParts.length === 0) return null;
    return <>{renderedParts}</>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto py-4"
      >
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
            <Bouncy size="18" speed="1.75" color="currentColor" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="pt-4 border-t space-y-3 px-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(spacePath, sessionId, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          className="min-h-[60px] max-h-[200px] resize-none"
          disabled={isSending || isAssistantTyping}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AgentSelector />
            <ModelSelector />
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
