import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PatchDiff } from "@pierre/diffs/react";
import { useConnectionStore } from "@/stores";

interface GitDiff {
  file_path: string;
  diff: string;
  additions: number;
  deletions: number;
}

type DiffsSearch = {
  folderPath?: string;
};

export const Route = createFileRoute("/diffs")({
  validateSearch: (search: Record<string, unknown>): DiffsSearch => {
    return {
      folderPath: search.folderPath as string | undefined,
    };
  },
  component: DiffsComponent,
});

function DiffsComponent() {
  const { folderPath } = Route.useSearch();
  const [diffs, setDiffs] = useState<GitDiff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setCurrentSpace } = useConnectionStore();

  useEffect(() => {
    if (!folderPath) {
      setLoading(false);
      setCurrentSpace(null);
      return;
    }

    setCurrentSpace(folderPath);

    async function initFolder() {
      try {
        const result = await invoke<GitDiff[]>("get_git_diffs", {
          path: folderPath,
        });
        setDiffs(result);
      } catch (err) {
        setError(err as string);
      } finally {
        setLoading(false);
      }
    }

    initFolder();
  }, [folderPath, setCurrentSpace]);

  if (!folderPath) {
    return (
      <div className="flex items-center justify-center h-full text-muted-fg">
        No folder selected
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-fg">
        Loading diffs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-danger">
        {error}
      </div>
    );
  }

  if (diffs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-fg">
        No changes detected
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Git Diffs</h1>
      <div className="space-y-4">
        {diffs.map((diff) => (
          <div key={diff.file_path} className="rounded-lg border border-border overflow-hidden">
            <PatchDiff
              patch={diff.diff}
              options={{
                theme: { dark: "github-dark", light: "github-light" },
                diffStyle: "unified",
                diffIndicators: "bars",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
