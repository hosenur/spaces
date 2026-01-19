import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, LinkSquare02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { formatTimeAgo } from "@/lib/time";
import { getGithubIssue } from "@/lib/tauri";
import type { GithubIssue } from "@/types/tauri";
import type { SpaceRouteContext } from "../route";

export const Route = createFileRoute("/space/$spacePath/issues/$issueId")({
  component: IssueDetailPage,
});

function IssueDetailPage() {
  const { spacePath: encodedPath, issueId } = Route.useParams();
  const { spacePath } = Route.useRouteContext() as SpaceRouteContext;
  const navigate = useNavigate();
  const [issue, setIssue] = useState<GithubIssue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const issueNumber = Number(issueId);
  const isValidIssueNumber = Number.isFinite(issueNumber);

  const loadIssue = useCallback(() => {
    if (!spacePath) {
      setIsLoading(false);
      return;
    }
    if (!isValidIssueNumber) {
      setError("Invalid issue id.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    requestAnimationFrame(() => {
      getGithubIssue(spacePath, issueNumber)
        .then((data) => {
          setIssue(data);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => {
          setIsLoading(false);
        });
    });
  }, [spacePath, issueNumber, isValidIssueNumber]);

  useEffect(() => {
    void loadIssue();
  }, [loadIssue]);

  const updatedAt = issue ? formatTimeAgo(new Date(issue.updatedAt).getTime()) : null;
  const body = issue?.body?.trim();

  return (
    <div className="flex flex-col h-full w-full bg-background/50">
      <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col px-4 py-6 md:px-8">
        <div className="mb-4">
          <Button
            intent="plain"
            size="xs"
            onPress={() => navigate({ to: "/space/$spacePath/issues", params: { spacePath: encodedPath } })}
          >
            Back to Issues
          </Button>
        </div>

        <header className="mb-6 flex items-start justify-between border-b border-border/40 pb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Alert02Icon} className="size-4 text-muted-fg" />
              <h1 className="text-xl font-medium tracking-tight text-foreground">
                {issue?.title ?? "Issue"}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-fg">
              <span className="font-mono">#{issue?.number ?? issueId}</span>
              {updatedAt && <span>Updated {updatedAt}</span>}
              {issue?.author?.login && <span>by {issue.author.login}</span>}
            </div>
          </div>
          <Button
            intent="plain"
            size="sq-sm"
            onPress={loadIssue}
            isDisabled={isLoading}
            aria-label="Refresh issue"
          >
            <HugeiconsIcon icon={RefreshIcon} className="size-4" />
          </Button>
        </header>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-fg">
            <Loader className="size-4" />
            Loading issue...
          </div>
        ) : error ? (
          <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        ) : issue ? (
          <div className="flex flex-col gap-4">
            {issue.assignees.length > 0 && (
              <div className="text-xs text-muted-fg">
                Assigned to {issue.assignees.map((user) => user.login).join(", ")}
              </div>
            )}

            {issue.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
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

            <Button
              intent="secondary"
              size="sm"
              className="w-fit"
              onPress={() => {
                if (issue.url) {
                  void openUrl(issue.url);
                }
              }}
            >
              <HugeiconsIcon icon={LinkSquare02Icon} className="size-4" />
              Open on GitHub
            </Button>

            <div className="rounded-md border border-border/40 bg-secondary/5 p-4">
              {body ? (
                <Streamdown>{body}</Streamdown>
              ) : (
                <p className="text-xs text-muted-fg">No description provided.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-fg">Issue not found.</div>
        )}
      </div>
    </div>
  );
}
