import { createFileRoute } from "@tanstack/react-router";
import { ChatWindow } from "@/components/chat-window";
import type { SpaceRouteContext } from "../route";

export const Route = createFileRoute("/space/$spacePath/session/$sessionId")({
  component: SessionChat,
});

function SessionChat() {
  const { sessionId } = Route.useParams();
  const { spacePath, port } = Route.useRouteContext() as SpaceRouteContext;

  return <ChatWindow port={port} sessionId={sessionId} spacePath={spacePath} />;
}
