import { create } from "zustand";
import type { ModelState, ModelOption, ProviderGroup, Provider } from "./types";

export const useModelStore = create<ModelState>((set, get) => ({
  providerGroups: [],
  selectedModel: null,
  isLoading: false,

  fetchModels: async (port: number) => {
    if (!port) return;

    set({ isLoading: true });

    try {
      const response = await fetch(`http://127.0.0.1:${port}/config/providers`);
      if (!response.ok) throw new Error("Failed to fetch models");

      const data: { providers: Provider[] } = await response.json();
      const groups: ProviderGroup[] = [];
      let firstModel: ModelOption | null = null;

      for (const provider of data.providers || []) {
        if (provider.models && Object.keys(provider.models).length > 0) {
          const models: ModelOption[] = [];
          for (const [modelId, model] of Object.entries(provider.models)) {
            const modelOption: ModelOption = {
              id: `${provider.id}/${modelId}`,
              modelId,
              providerId: provider.id,
              name: model.name,
              providerName: provider.name,
            };
            models.push(modelOption);
            if (!firstModel) firstModel = modelOption;
          }
          groups.push({
            id: provider.id,
            name: provider.name,
            models,
          });
        }
      }

      set({ providerGroups: groups, isLoading: false });

      const { selectedModel } = get();
      if (!selectedModel && firstModel) {
        set({ selectedModel: firstModel });
      }
    } catch (err) {
      console.error("Failed to fetch models:", err);
      set({ isLoading: false });
    }
  },

  setSelectedModel: (model: ModelOption | null) => {
    set({ selectedModel: model });
  },

  clearModels: () => {
    set({ providerGroups: [], selectedModel: null });
  },
}));
