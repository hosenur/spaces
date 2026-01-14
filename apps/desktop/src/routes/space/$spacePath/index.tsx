import { createFileRoute } from "@tanstack/react-router";
import { useConnectionStore } from "@/stores";
import { Loader } from "@/components/ui/loader";

export const Route = createFileRoute("/space/$spacePath/")({
  component: SpaceIndex,
});

function SpaceIndex() {
  const { currentSpacePath, isServerBooting } = useConnectionStore();

  if (!currentSpacePath || isServerBooting) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader className="size-6" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
    </div>
  );
}
