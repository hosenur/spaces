import type { ToolPart as ToolPartType } from "@opencode-ai/sdk";

interface ToolPartProps {
  part: ToolPartType;
}

export function ToolPart({ part }: ToolPartProps) {
  const toolName = part.tool || "Unknown tool";
  const status = part.state?.status || "pending";
  const toolInput = part.state?.input;

  return (
    <div className="bg-secondary/50 rounded px-3 py-2 text-xs font-mono">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{toolName}</span>
        <span
          className={`text-xs ${status === "completed" ? "text-green-600" : status === "error" ? "text-red-600" : "text-yellow-600"}`}
        >
          [{status}]
        </span>
      </div>
      {toolInput && Object.keys(toolInput).length > 0 && (
        <div className="mt-1 text-muted-fg truncate">
          {JSON.stringify(toolInput).slice(0, 100)}...
        </div>
      )}
    </div>
  );
}
