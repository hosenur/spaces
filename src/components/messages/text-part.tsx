import type { TextPart as TextPartType } from "@opencode-ai/sdk";
import { Streamdown } from "streamdown";

interface TextPartProps {
  part: TextPartType;
}

export function TextPart({ part }: TextPartProps) {
  if (!part.text?.trim()) {
    return null;
  }

  return <Streamdown>{part.text}</Streamdown>;
}
