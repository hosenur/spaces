import { create } from "zustand";
import * as tauri from "@/lib/tauri";
import type { AppConfig, Task, SpaceConfig } from "@/types/config";

interface ConfigState {
  config: AppConfig | null;
  isLoading: boolean;
  showApiKeyModal: boolean;
  fetchConfig: () => Promise<void>;
  setGroqApiKey: (apiKey: string) => Promise<boolean>;
  clearGroqApiKey: () => Promise<boolean>;
  addSpaceToConfig: (clonedPath: string, randomName: string) => Promise<void>;
  setSpaceBranchName: (clonedPath: string, branchName: string) => Promise<void>;
  getSpaceConfig: (clonedPath: string) => SpaceConfig | undefined;
  setShowApiKeyModal: (show: boolean) => void;
  addTask: (clonedPath: string, text: string) => Promise<Task | undefined>;
  removeTask: (clonedPath: string, taskId: string) => Promise<void>;
  toggleTask: (clonedPath: string, taskId: string) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  isLoading: true,
  showApiKeyModal: false,

  fetchConfig: async () => {
    set({ isLoading: true });
    try {
      const config = await tauri.getConfig();
      set({ 
        config, 
        isLoading: false,
        showApiKeyModal: !config.groq_api_key,
      });
    } catch (err) {
      console.error("Failed to fetch config:", err);
      set({ isLoading: false, showApiKeyModal: true });
    }
  },

  setGroqApiKey: async (apiKey: string) => {
    try {
      await tauri.setGroqApiKey(apiKey);
      set((state) => ({
        config: state.config ? { ...state.config, groq_api_key: apiKey } : { groq_api_key: apiKey, spaces: [] },
        showApiKeyModal: false,
      }));
      return true;
    } catch (err) {
      console.error("Failed to set API key:", err);
      return false;
    }
  },

  clearGroqApiKey: async () => {
    try {
      await tauri.clearGroqApiKey();
      set((state) => ({
        config: state.config ? { ...state.config, groq_api_key: undefined } : { groq_api_key: undefined, spaces: [] },
        showApiKeyModal: true,
      }));
      return true;
    } catch (err) {
      console.error("Failed to clear API key:", err);
      return false;
    }
  },

  addSpaceToConfig: async (clonedPath: string, randomName: string) => {
    try {
      await tauri.addSpaceToConfig(clonedPath, randomName);
      try {
        const config = await tauri.getConfig();
        set({
          config,
          showApiKeyModal: !config.groq_api_key,
        });
      } catch (err) {
        console.error("Failed to refresh config after adding space:", err);
        const now = Date.now();
        set((state) => {
          if (!state.config) {
            return {
              config: {
                groq_api_key: undefined,
                spaces: [
                  {
                    cloned_path: clonedPath,
                    random_name: randomName,
                    created_at: now,
                    tasks: [],
                  },
                ],
              },
            };
          }
          const exists = state.config.spaces.some((s) => s.cloned_path === clonedPath);
          if (exists) return state;
          return {
            config: {
              ...state.config,
              spaces: [...state.config.spaces, { cloned_path: clonedPath, random_name: randomName, created_at: now, tasks: [] }],
            },
          };
        });
      }
    } catch (err) {
      console.error("Failed to add space to config:", err);
    }
  },

  setSpaceBranchName: async (clonedPath: string, branchName: string) => {
    try {
      await tauri.setSpaceBranchName(clonedPath, branchName);
      const state = get();
      const hasSpace = state.config?.spaces.some((s) => s.cloned_path === clonedPath);
      if (!state.config || !hasSpace) {
        const config = await tauri.getConfig();
        set({
          config,
          showApiKeyModal: !config.groq_api_key,
        });
        return;
      }
      set({
        config: {
          ...state.config,
          spaces: state.config.spaces.map((s) =>
            s.cloned_path === clonedPath ? { ...s, branch_name: branchName } : s
          ),
        },
      });
    } catch (err) {
      console.error("Failed to set branch name:", err);
    }
  },

  getSpaceConfig: (clonedPath: string) => {
    return get().config?.spaces.find((s) => s.cloned_path === clonedPath);
  },

  setShowApiKeyModal: (show: boolean) => {
    set({ showApiKeyModal: show });
  },

  addTask: async (clonedPath: string, text: string) => {
    try {
      const task = await tauri.addTask(clonedPath, text);
      set((state) => {
        if (!state.config) return state;
        return {
          config: {
            ...state.config,
            spaces: state.config.spaces.map((s) =>
              s.cloned_path === clonedPath ? { ...s, tasks: [...(s.tasks || []), task] } : s
            ),
          },
        };
      });
      return task;
    } catch (err) {
      console.error("Failed to add task:", err);
      return undefined;
    }
  },

  removeTask: async (clonedPath: string, taskId: string) => {
    try {
      await tauri.removeTask(clonedPath, taskId);
      set((state) => {
        if (!state.config) return state;
        return {
          config: {
            ...state.config,
            spaces: state.config.spaces.map((s) =>
              s.cloned_path === clonedPath ? { ...s, tasks: (s.tasks || []).filter((t) => t.id !== taskId) } : s
            ),
          },
        };
      });
    } catch (err) {
      console.error("Failed to remove task:", err);
    }
  },

  toggleTask: async (clonedPath: string, taskId: string) => {
    try {
      await tauri.toggleTask(clonedPath, taskId);
      set((state) => {
        if (!state.config) return state;
        return {
          config: {
            ...state.config,
            spaces: state.config.spaces.map((s) =>
              s.cloned_path === clonedPath
                ? {
                    ...s,
                    tasks: (s.tasks || []).map((t) =>
                      t.id === taskId ? { ...t, completed: !t.completed } : t
                    ),
                  }
                : s
            ),
          },
        };
      });
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  },
}));
