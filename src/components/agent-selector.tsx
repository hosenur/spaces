import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useAgentStore } from "@/stores";

export function AgentSelector() {
  const { agents, selectedAgent, setSelectedAgent } = useAgentStore();

  if (agents.length === 0) return null;

  return (
    <Select
      selectedKey={selectedAgent}
      onSelectionChange={(key) => setSelectedAgent(key as string)}
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
