import type { ReasoningPart as ReasoningPartType } from "@opencode-ai/sdk";
import { Streamdown } from "streamdown";

interface ReasoningPartProps {
  part: ReasoningPartType;
}

export function ReasoningPart({ part }: ReasoningPartProps) {
  if (!part.text?.trim()) {
    return null;
  }

  return (
    <div className="text-muted-fg italic">
      <Streamdown>{part.text}</Streamdown>
    </div>
  );
}
