import type { Agent, Message, Part, Session } from "@opencode-ai/sdk";

// Connection types
export interface OpenCodeServer {
  path: string;
  port: number;
}

export interface ConnectionState {
  servers: Map<string, number>;
  currentSpacePath: string | null;
  isServerBooting: boolean;
  setCurrentSpace: (path: string | null) => Promise<void>;
  startAllServers: () => Promise<void>;
  getPort: (spacePath: string) => number | undefined;
  removeServer: (spacePath: string) => void;
}

// Session types
export interface SpaceSessionState {
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
}

export interface SessionState {
  spaces: Record<string, SpaceSessionState>;
  getSpaceSessions: (spacePath: string) => SpaceSessionState;
  fetchSessions: (port: number, spacePath: string) => Promise<void>;
  createSession: (port: number, spacePath: string) => Promise<Session | null>;
  upsertSession: (spacePath: string, session: Session) => void;
  removeSession: (spacePath: string, sessionId: string) => void;
  clearSessions: (spacePath: string) => void;
}

// Agent types
export type AgentWithHidden = Agent & { hidden?: boolean };

export interface AgentState {
  agents: AgentWithHidden[];
  selectedAgent: string;
  isLoading: boolean;
  fetchAgents: (port: number) => Promise<void>;
  setSelectedAgent: (agent: string) => void;
  clearAgents: () => void;
}

// Model types
export interface ProviderModel {
  id: string;
  name: string;
  providerID: string;
}

export interface Provider {
  id: string;
  name: string;
  models: Record<string, ProviderModel>;
}

export interface ModelOption {
  id: string;
  modelId: string;
  providerId: string;
  name: string;
  providerName: string;
}

export interface ProviderGroup {
  id: string;
  name: string;
  models: ModelOption[];
}

export interface ModelState {
  providerGroups: ProviderGroup[];
  selectedModel: ModelOption | null;
  isLoading: boolean;
  fetchModels: (port: number) => Promise<void>;
  setSelectedModel: (model: ModelOption | null) => void;
  clearModels: () => void;
}

// Chat types
export interface MessageWithParts {
  info: Message;
  parts: Part[];
}

export interface SessionChatState {
  messages: MessageWithParts[];
  isLoading: boolean;
  isSending: boolean;
  isAssistantTyping: boolean;
  error: string | null;
  input: string;
}

export interface SpaceChatState {
  sessions: Record<string, SessionChatState>;
}

export interface ChatState {
  spaces: Record<string, SpaceChatState>;
  getSession: (spacePath: string, sessionId: string) => SessionChatState;
  isSpaceActive: (spacePath: string) => boolean;
  fetchMessages: (port: number, spacePath: string, sessionId: string) => Promise<void>;
  sendMessage: (
    port: number,
    spacePath: string,
    sessionId: string,
    text: string,
    agent?: string,
    model?: { modelID: string; providerID: string }
  ) => Promise<boolean>;
  setInput: (spacePath: string, sessionId: string, input: string) => void;
  setIsAssistantTyping: (spacePath: string, sessionId: string, typing: boolean) => void;
  clearSession: (spacePath: string, sessionId: string) => void;
}
