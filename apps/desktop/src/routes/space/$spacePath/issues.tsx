import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { decodeSpacePath } from "@/lib/space-path";
import { formatTimeAgo } from "@/lib/time";
import { getGithubIssues } from "@/lib/tauri";
import type { GithubIssue } from "@/types/tauri";

export const Route = createFileRoute("/space/$spacePath/issues")({
  component: IssuesPage,
});

function IssuesPage() {
  const { spacePath } = Route.useParams();
  const decodedPath = decodeSpacePath(spacePath);
  const [issues, setIssues] = useState<GithubIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIssues = useCallback(async () => {
    if (!decodedPath) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getGithubIssues(decodedPath);
      const sorted = [...data].sort((a, b) => {
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        return timeB - timeA;
      });
      setIssues(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [decodedPath]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const issueCount = issues.length;
  const emptyState = !isLoading && !error && issueCount === 0;

  return (
    <div className="flex flex-col h-full w-full bg-background/50">
      <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col px-4 py-6 md:px-8">
        <header className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-baseline gap-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Alert02Icon} className="size-4 text-muted-fg" />
              <h1 className="text-xl font-medium tracking-tight text-foreground">
                Issues
              </h1>
            </div>
            <p className="text-muted-fg text-xs font-mono">
              {issueCount} {issueCount === 1 ? "item" : "items"}
            </p>
          </div>
          <Button
            intent="plain"
            size="sq-sm"
            onPress={loadIssues}
            isDisabled={isLoading}
            aria-label="Refresh issues"
          >
            <HugeiconsIcon icon={RefreshIcon} className="size-4" />
          </Button>
        </header>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-fg">
            <Loader className="size-4" />
            Loading issues...
          </div>
        ) : error ? (
          <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        ) : emptyState ? (
          <div className="h-24 flex items-center justify-center border border-dashed border-border/30 rounded-md bg-secondary/5">
            <p className="text-muted-fg/50 text-xs">No issues found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-[1px]">
            {issues.map((issue) => {
              const isOpen = issue.state.toLowerCase() === "open";
              const updatedAt = formatTimeAgo(new Date(issue.updatedAt).getTime());
              const labelCount = issue.labels.length;
              return (
                <div
                  key={issue.number}
                  className="group flex items-start gap-3 py-3 px-2 rounded hover:bg-secondary/40 transition-colors duration-150"
                >
                  <div className="mt-1 text-xs font-mono text-muted-fg">
                    #{issue.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="text-sm text-foreground/90 hover:text-foreground transition-colors text-left"
                        onClick={() => {
                          void openUrl(issue.url);
                        }}
                      >
                        {issue.title}
                      </button>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                          isOpen
                            ? "border-emerald-500/40 text-emerald-500/90"
                            : "border-muted-fg/30 text-muted-fg"
                        }`}
                      >
                        {issue.state}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                      <span>Updated {updatedAt}</span>
                      {issue.author?.login && <span>by {issue.author.login}</span>}
                      {issue.assignees.length > 0 && (
                        <span>
                          Assigned to {issue.assignees.map((user) => user.login).join(", ")}
                        </span>
                      )}
                    </div>
                    {labelCount > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {issue.labels.map((label) => (
                          <span
                            key={`${issue.number}-${label.name}`}
                            className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
                            style={{
                              borderColor: `#${label.color}`,
                              color: `#${label.color}`,
                            }}
                            title={label.description || label.name}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    intent="plain"
                    size="xs"
                    onPress={() => {
                      void openUrl(issue.url);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  >
                    Open
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
