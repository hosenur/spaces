import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface SpaceConfig {
  cloned_path: string;
  random_name: string;
  branch_name?: string;
  created_at?: number;
}

export interface AppConfig {
  groq_api_key?: string;
  spaces: SpaceConfig[];
}

interface ConfigState {
  config: AppConfig | null;
  isLoading: boolean;
  showApiKeyModal: boolean;
  fetchConfig: () => Promise<void>;
  setGroqApiKey: (apiKey: string) => Promise<void>;
  addSpaceToConfig: (clonedPath: string, randomName: string) => Promise<void>;
  setSpaceBranchName: (clonedPath: string, branchName: string) => Promise<void>;
  getSpaceConfig: (clonedPath: string) => SpaceConfig | undefined;
  setShowApiKeyModal: (show: boolean) => void;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  isLoading: true,
  showApiKeyModal: false,

  fetchConfig: async () => {
    set({ isLoading: true });
    try {
      const config = await invoke<AppConfig>("get_config");
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
      await invoke("set_groq_api_key", { apiKey });
      set((state) => ({
        config: state.config ? { ...state.config, groq_api_key: apiKey } : { groq_api_key: apiKey, spaces: [] },
        showApiKeyModal: false,
      }));
    } catch (err) {
      console.error("Failed to set API key:", err);
    }
  },

  addSpaceToConfig: async (clonedPath: string, randomName: string) => {
    try {
      await invoke("add_space_to_config", { clonedPath, randomName });
      const now = Date.now();
      set((state) => {
        if (!state.config) return state;
        const exists = state.config.spaces.some((s) => s.cloned_path === clonedPath);
        if (exists) return state;
        return {
          config: {
            ...state.config,
            spaces: [...state.config.spaces, { cloned_path: clonedPath, random_name: randomName, created_at: now }],
          },
        };
      });
    } catch (err) {
      console.error("Failed to add space to config:", err);
    }
  },

  setSpaceBranchName: async (clonedPath: string, branchName: string) => {
    try {
      await invoke("set_space_branch_name", { clonedPath, branchName });
      set((state) => {
        if (!state.config) return state;
        return {
          config: {
            ...state.config,
            spaces: state.config.spaces.map((s) =>
              s.cloned_path === clonedPath ? { ...s, branch_name: branchName } : s
            ),
          },
        };
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
}));
