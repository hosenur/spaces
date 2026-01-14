import { create } from "zustand";
import type { ChatState, SessionChatState, SpaceChatState, MessageWithParts } from "./types";

const DEFAULT_SESSION_STATE: SessionChatState = {
  messages: [],
  isLoading: true,
  isSending: false,
  isAssistantTyping: false,
  error: null,
  input: "",
};

const DEFAULT_SPACE_STATE: SpaceChatState = {
  sessions: {},
};

export const useChatStore = create<ChatState>((set, get) => ({
  spaces: {},

  getSession: (spacePath: string, sessionId: string) => {
    return get().spaces[spacePath]?.sessions[sessionId] ?? DEFAULT_SESSION_STATE;
  },

  isSpaceActive: (spacePath: string) => {
    const space = get().spaces[spacePath];
    if (!space) return false;
    return Object.values(space.sessions).some(
      (session) => session.isAssistantTyping || session.isSending
    );
  },

  fetchMessages: async (port: number, spacePath: string, sessionId: string) => {
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
      set((state) => ({
        spaces: {
          ...state.spaces,
          [spacePath]: {
            ...(state.spaces[spacePath] ?? DEFAULT_SPACE_STATE),
            sessions: {
              ...(state.spaces[spacePath]?.sessions ?? {}),
              [sessionId]: {
                ...(state.spaces[spacePath]?.sessions[sessionId] ?? DEFAULT_SESSION_STATE),
                messages: validMessages,
                error: null,
                isLoading: false,
              },
            },
          },
        },
      }));
    } catch (err) {
      set((state) => ({
        spaces: {
          ...state.spaces,
          [spacePath]: {
            ...(state.spaces[spacePath] ?? DEFAULT_SPACE_STATE),
            sessions: {
              ...(state.spaces[spacePath]?.sessions ?? {}),
              [sessionId]: {
                ...(state.spaces[spacePath]?.sessions[sessionId] ?? DEFAULT_SESSION_STATE),
                error: err instanceof Error ? err.message : "Failed to fetch messages",
                isLoading: false,
              },
            },
          },
        },
      }));
    }
  },

  sendMessage: async (port, spacePath, sessionId, text, agent, model) => {
    if (!text.trim() || !port) return false;

    set((state) => ({
      spaces: {
        ...state.spaces,
        [spacePath]: {
          ...(state.spaces[spacePath] ?? DEFAULT_SPACE_STATE),
          sessions: {
            ...(state.spaces[spacePath]?.sessions ?? {}),
            [sessionId]: {
              ...(state.spaces[spacePath]?.sessions[sessionId] ?? DEFAULT_SESSION_STATE),
              isSending: true,
            },
          },
        },
      },
    }));

    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/session/${sessionId}/prompt_async`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parts: [{ type: "text", text }],
            agent: agent || undefined,
            model: model || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      set((state) => ({
        spaces: {
          ...state.spaces,
          [spacePath]: {
            ...(state.spaces[spacePath] ?? DEFAULT_SPACE_STATE),
            sessions: {
              ...(state.spaces[spacePath]?.sessions ?? {}),
              [sessionId]: {
                ...(state.spaces[spacePath]?.sessions[sessionId] ?? DEFAULT_SESSION_STATE),
                isSending: false,
                input: "",
              },
            },
          },
        },
      }));
      return true;
    } catch (err) {
      set((state) => ({
        spaces: {
          ...state.spaces,
          [spacePath]: {
            ...(state.spaces[spacePath] ?? DEFAULT_SPACE_STATE),
            sessions: {
              ...(state.spaces[spacePath]?.sessions ?? {}),
              [sessionId]: {
                ...(state.spaces[spacePath]?.sessions[sessionId] ?? DEFAULT_SESSION_STATE),
                error: err instanceof Error ? err.message : "Failed to send message",
                isSending: false,
              },
            },
          },
        },
      }));
      return false;
    }
  },

  setInput: (spacePath: string, sessionId: string, input: string) => {
    set((state) => ({
      spaces: {
        ...state.spaces,
        [spacePath]: {
          ...(state.spaces[spacePath] ?? DEFAULT_SPACE_STATE),
          sessions: {
            ...(state.spaces[spacePath]?.sessions ?? {}),
            [sessionId]: {
              ...(state.spaces[spacePath]?.sessions[sessionId] ?? DEFAULT_SESSION_STATE),
              input,
            },
          },
        },
      },
    }));
  },

  setIsAssistantTyping: (spacePath: string, sessionId: string, typing: boolean) => {
    set((state) => ({
      spaces: {
        ...state.spaces,
        [spacePath]: {
          ...(state.spaces[spacePath] ?? DEFAULT_SPACE_STATE),
          sessions: {
            ...(state.spaces[spacePath]?.sessions ?? {}),
            [sessionId]: {
              ...(state.spaces[spacePath]?.sessions[sessionId] ?? DEFAULT_SESSION_STATE),
              isAssistantTyping: typing,
            },
          },
        },
      },
    }));
  },

  clearSession: (spacePath: string, sessionId: string) => {
    set((state) => ({
      spaces: {
        ...state.spaces,
        [spacePath]: {
          ...(state.spaces[spacePath] ?? DEFAULT_SPACE_STATE),
          sessions: {
            ...(state.spaces[spacePath]?.sessions ?? {}),
            [sessionId]: { ...DEFAULT_SESSION_STATE },
          },
        },
      },
    }));
  },
}));
