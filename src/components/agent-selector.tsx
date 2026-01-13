import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface Agent {
  name: string;
  hidden?: boolean;
  mode?: string;
}

interface AgentSelectorProps {
  port: number;
  value: string;
  onChange: (agent: string) => void;
}

export function AgentSelector({ port, value, onChange }: AgentSelectorProps) {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (!port) return;

    fetch(`http://127.0.0.1:${port}/agent`)
      .then((res) => res.json())
      .then((data: Agent[]) => {
        const visibleAgents = data.filter(
          (a) => !a.hidden && a.mode !== "subagent"
        );
        setAgents(visibleAgents);
        if (visibleAgents.length > 0 && !value) {
          onChange(visibleAgents[0].name);
        }
      })
      .catch(() => {});
  }, [port]);

  if (agents.length === 0) return null;

  return (
    <Select
      selectedKey={value}
      onSelectionChange={(key) => onChange(key as string)}
      aria-label="Select agent"
    >
      <SelectTrigger className="w-32 h-8 text-xs" />
      <SelectContent>
        {agents.map((agent) => (
          <SelectItem key={agent.name} id={agent.name}>
            {agent.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
