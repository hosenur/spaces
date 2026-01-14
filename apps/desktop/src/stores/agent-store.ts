import { create } from "zustand";
import type { AgentState, AgentWithHidden } from "./types";

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  selectedAgent: "",
  isLoading: false,

  fetchAgents: async (port: number) => {
    if (!port) return;

    set({ isLoading: true });

    try {
      const response = await fetch(`http://127.0.0.1:${port}/agent`);
      if (!response.ok) throw new Error("Failed to fetch agents");
      
      const data: AgentWithHidden[] = await response.json();
      const visibleAgents = data.filter(
        (a) => !a.hidden && a.mode !== "subagent"
      );
      
      set({ agents: visibleAgents, isLoading: false });
      
      const { selectedAgent } = get();
      if (!selectedAgent && visibleAgents.length > 0) {
        set({ selectedAgent: visibleAgents[0].name });
      }
    } catch (err) {
      console.error("Failed to fetch agents:", err);
      set({ isLoading: false });
    }
  },

  setSelectedAgent: (agent: string) => {
    set({ selectedAgent: agent });
  },

  clearAgents: () => {
    set({ agents: [], selectedAgent: "" });
  },
}));
