import { createFileRoute } from "@tanstack/react-router";
import { useConnectionStore } from "@/stores";
import { ChatWindow } from "@/components/chat-window";
import { decodeSpacePath } from "@/lib/space-path";

export const Route = createFileRoute("/space/$spacePath/session/$sessionId")({
  component: SessionChat,
});

function SessionChat() {
  const { spacePath, sessionId } = Route.useParams();
  const { servers, currentSpacePath } = useConnectionStore();

  const decodedPath = decodeSpacePath(spacePath);
  const port = servers.get(decodedPath);

  if (!currentSpacePath || !port) {
    return (
      <div className="flex items-center justify-center h-full text-muted-fg">
        Connecting to space...
      </div>
    );
  }

  return <ChatWindow port={port} sessionId={sessionId} spacePath={decodedPath} />;
}
