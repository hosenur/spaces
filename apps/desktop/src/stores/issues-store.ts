import { create } from "zustand";
import type { GithubIssue } from "@/types/tauri";

export interface IssuesState {
  issues: GithubIssue[];
  isLoading: boolean;
  error: string | null;
  currentSpacePath: string | null;
  setIssues: (issues: GithubIssue[], spacePath: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useIssuesStore = create<IssuesState>((set) => ({
  issues: [],
  isLoading: false,
  error: null,
  currentSpacePath: null,

  setIssues: (issues, spacePath) => set({ issues, currentSpacePath: spacePath }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clear: () =>
    set({
      issues: [],
      isLoading: false,
      error: null,
      currentSpacePath: null,
    }),
}));
