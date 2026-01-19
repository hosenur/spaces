import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfigStore } from "@/stores/config-store";
import type { Task } from "@/types/config";
import type { SpaceRouteContext } from "./route";

export const Route = createFileRoute("/space/$spacePath/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { spacePath } = Route.useRouteContext() as SpaceRouteContext;
  const [newTaskText, setNewTaskText] = useState("");

  const config = useConfigStore((state) => state.config);
  const addTask = useConfigStore((state) => state.addTask);
  const removeTask = useConfigStore((state) => state.removeTask);
  const toggleTask = useConfigStore((state) => state.toggleTask);

  const spaceConfig = config?.spaces.find((s) => s.cloned_path === spacePath);
  const tasks = spaceConfig?.tasks || [];

  async function handleAddTask() {
    if (!newTaskText.trim()) return;
    await addTask(spacePath, newTaskText.trim());
    setNewTaskText("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleAddTask();
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-background/50">
      <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col px-4 py-6 md:px-8">
        
        {/* Header Section */}
        <header className="mb-6 flex items-baseline gap-3 border-b border-border/40 pb-4">
          <h1 className="text-xl font-medium tracking-tight text-foreground">
            Tasks
          </h1>
          <p className="text-muted-fg text-xs font-mono">
            {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
          </p>
        </header>

        {/* Input Section */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Add a new task..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 text-sm"
          />
          <Button onPress={handleAddTask} intent="primary" size="sm" className="px-4">
            Add
          </Button>
        </div>

        {/* Task List */}
        <div className="flex flex-col w-full flex-1 overflow-y-auto pr-2 -mr-2">
          {tasks.length === 0 ? (
            <div className="h-24 flex items-center justify-center border border-dashed border-border/30 rounded-md bg-secondary/5">
              <p className="text-muted-fg/50 text-xs">No tasks yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-[1px]">
              {tasks.map((task: Task) => (
                <div
                  key={task.id}
                  className="group flex items-center gap-3 py-2 px-2 rounded hover:bg-secondary/40 transition-colors duration-150"
                >
                  <Checkbox
                    isSelected={task.completed}
                    onChange={() => toggleTask(spacePath, task.id)}
                    className="size-4 rounded-[3px] data-[selected=true]:bg-foreground data-[selected=true]:border-foreground transition-all"
                  />
                  <span
                    className={`flex-1 text-sm transition-opacity duration-200 ${
                      task.completed 
                        ? "line-through text-muted-fg/50" 
                        : "text-foreground/90"
                    }`}
                  >
                    {task.text}
                  </span>
                  <Button
                    size="sq-xs"
                    intent="plain"
                    onPress={() => removeTask(spacePath, task.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 size-6"
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5 text-muted-fg hover:text-red-500/80 transition-colors" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
