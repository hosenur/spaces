import { create } from "zustand";
import type { Session } from "@opencode-ai/sdk";
import type { SessionState, SpaceSessionState } from "./types";

const DEFAULT_SPACE_SESSION_STATE: SpaceSessionState = {
  sessions: [],
  isLoading: false,
  error: null,
};

const creatingSessions = new Map<string, Promise<Session | null>>();

export const useSessionStore = create<SessionState>((set, get) => ({
  spaces: {},

  getSpaceSessions: (spacePath: string) => {
    return get().spaces[spacePath] ?? DEFAULT_SPACE_SESSION_STATE;
  },

  fetchSessions: async (port: number, spacePath: string) => {
    if (!port) {
      set((state) => ({
        spaces: {
          ...state.spaces,
          [spacePath]: { ...DEFAULT_SPACE_SESSION_STATE },
        },
      }));
      return;
    }

    set((state) => ({
      spaces: {
        ...state.spaces,
        [spacePath]: {
          ...(state.spaces[spacePath] ?? DEFAULT_SPACE_SESSION_STATE),
          isLoading: true,
          error: null,
        },
      },
    }));

    try {
      const response = await fetch(`http://127.0.0.1:${port}/session`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`);
      }
      const data = await response.json();
      set((state) => ({
        spaces: {
          ...state.spaces,
          [spacePath]: {
            sessions: data,
            isLoading: false,
            error: null,
          },
        },
      }));
    } catch (err) {
      set((state) => ({
        spaces: {
          ...state.spaces,
          [spacePath]: {
            sessions: [],
            isLoading: false,
            error: err instanceof Error ? err.message : "Failed to fetch sessions",
          },
        },
      }));
    }
  },

  createSession: async (port: number, spacePath: string) => {
    if (!port) return null;

    const existing = creatingSessions.get(spacePath);
    if (existing) return existing;

    const createPromise = (async () => {
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
        set((state) => ({
          spaces: {
            ...state.spaces,
            [spacePath]: {
              ...(state.spaces[spacePath] ?? DEFAULT_SPACE_SESSION_STATE),
              sessions: [session, ...(state.spaces[spacePath]?.sessions ?? [])],
            },
          },
        }));
        return session;
      } catch (err) {
        console.error("Failed to create session:", err);
        return null;
      }
    })();

    creatingSessions.set(spacePath, createPromise);
    const session = await createPromise;
    creatingSessions.delete(spacePath);
    return session;
  },

  clearSessions: (spacePath: string) => {
    set((state) => ({
      spaces: {
        ...state.spaces,
        [spacePath]: { ...DEFAULT_SPACE_SESSION_STATE },
      },
    }));
  },
}));
