import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, RefreshIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { formatTimeAgo } from "@/lib/time";
import { useGithubIssues } from "@/hooks/use-github-issues";
import type { SpaceRouteContext } from "./route";

export const Route = createFileRoute("/space/$spacePath/issues")({
  component: IssuesPage,
});

function IssuesPage() {
  const { spacePath: encodedPath } = Route.useParams();
  const { spacePath } = Route.useRouteContext() as SpaceRouteContext;
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDetailRoute = /\/issues\/[^/]+$/.test(pathname);
  const [selectedTab, setSelectedTab] = useState<"open" | "closed">("open");

  const { data: issues = [], isLoading, error, mutate } = useGithubIssues(spacePath);

  if (isDetailRoute) {
    return <Outlet />;
  }

  const openIssues = issues.filter((issue) => issue.state.toLowerCase() === "open");
  const closedIssues = issues.filter((issue) => issue.state.toLowerCase() === "closed");
  const visibleIssues = selectedTab === "open" ? openIssues : closedIssues;
  const issueCount = visibleIssues.length;

  const renderIssues = (filteredIssues: typeof issues, emptyLabel: string) => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-fg">
          <Loader className="size-4" />
          Loading issues...
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error instanceof Error ? error.message : String(error)}
        </div>
      );
    }

    if (filteredIssues.length === 0) {
      return (
        <div className="h-24 flex items-center justify-center border border-dashed border-border/30 rounded-md bg-secondary/5">
          <p className="text-muted-fg/50 text-xs">{emptyLabel}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-[1px]">
        {filteredIssues.map((issue) => {
          const updatedAt = formatTimeAgo(new Date(issue.updatedAt).getTime());
          const labelCount = issue.labels.length;
          return (
            <button
              key={issue.number}
              type="button"
              onClick={() =>
                navigate({
                  to: "/space/$spacePath/issues/$issueId",
                  params: { spacePath: encodedPath, issueId: String(issue.number) },
                })
              }
              className="group flex items-start gap-3 py-3 px-2 rounded transition-colors duration-150 text-left w-full hover:bg-secondary/40"
            >
              <div className="mt-1 text-xs font-mono text-muted-fg">
                #{issue.number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-foreground/90">
                    {issue.title}
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
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-background/50">
      <div className="flex-1 w-full flex flex-col px-4 py-6 md:px-8">
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
            onPress={() => mutate()}
            isDisabled={isLoading}
            aria-label="Refresh issues"
          >
            <HugeiconsIcon icon={RefreshIcon} className="size-4" />
          </Button>
        </header>

        <Tabs
          aria-label="Issues"
          selectedKey={selectedTab}
          onSelectionChange={(key) => {
            if (key === "open" || key === "closed") {
              setSelectedTab(key);
            }
          }}
        >
          <TabList>
            <Tab id="open">Open</Tab>
            <Tab id="closed">Closed</Tab>
          </TabList>
          <TabPanel id="open" className="pt-4">
            {renderIssues(openIssues, "No open issues found")}
          </TabPanel>
          <TabPanel id="closed" className="pt-4">
            {renderIssues(closedIssues, "No closed issues found")}
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
}
