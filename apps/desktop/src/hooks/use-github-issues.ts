import useSWR, { preload } from "swr";
import { getGithubIssues, getGithubIssue } from "@/lib/tauri";
import type { GithubIssue } from "@/types/tauri";

const ISSUES_TTL = 60_000;

async function fetchIssues(spacePath: string): Promise<GithubIssue[]> {
  const data = await getGithubIssues(spacePath);
  return [...data].sort((a, b) => {
    const timeA = new Date(a.updatedAt).getTime();
    const timeB = new Date(b.updatedAt).getTime();
    return timeB - timeA;
  });
}

export function useGithubIssues(spacePath?: string) {
  return useSWR(
    spacePath ? ["issues", spacePath] : null,
    () => fetchIssues(spacePath!),
    {
      dedupingInterval: ISSUES_TTL,
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
}

export function useGithubIssue(spacePath?: string, issueNumber?: number) {
  const { data: issues } = useGithubIssues(spacePath);
  
  const cachedIssue = issues?.find((i) => i.number === issueNumber);
  
  return useSWR(
    spacePath && issueNumber ? ["issue", spacePath, issueNumber] : null,
    async () => {
      if (cachedIssue?.body !== undefined) {
        return cachedIssue;
      }
      return getGithubIssue(spacePath!, issueNumber!);
    },
    {
      dedupingInterval: ISSUES_TTL,
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      fallbackData: cachedIssue,
    }
  );
}

export function prefetchIssues(spacePath: string) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(() => {
      preload(["issues", spacePath], () => fetchIssues(spacePath));
    });
  } else {
    setTimeout(() => {
      preload(["issues", spacePath], () => fetchIssues(spacePath));
    }, 100);
  }
}
