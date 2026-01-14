import { type ComponentProps } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, RefreshIcon, Add01Icon } from "@hugeicons/core-free-icons";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useConnectionStore, useSessionStore } from "@/stores";
import { encodeSpacePath } from "@/lib/space-path";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarLabel,
  SidebarSection,
  SidebarSectionGroup,
  SidebarItem,
} from "@/components/ui/sidebar";

export default function WorkspaceSidebar(props: ComponentProps<typeof Sidebar>) {
  const { currentSpacePath, getPort } = useConnectionStore();
  const { getSpaceSessions, fetchSessions, createSession } = useSessionStore();
  const navigate = useNavigate();

  const port = currentSpacePath ? getPort(currentSpacePath) : undefined;
  
  // Get sessions for the current space only
  const { sessions, isLoading, error } = currentSpacePath 
    ? getSpaceSessions(currentSpacePath) 
    : { sessions: [], isLoading: false, error: null };

  async function handleNewSession() {
    if (!currentSpacePath || !port) return;
    const session = await createSession(port, currentSpacePath);
    if (session) {
      const spacePath = encodeSpacePath(currentSpacePath);
      navigate({
        to: "/space/$spacePath/session/$sessionId",
        params: { spacePath, sessionId: session.id },
      });
    }
  }

  async function handleRefresh() {
    if (!port || !currentSpacePath) return;
    await fetchSessions(port, currentSpacePath);
  }

  function handleSessionClick(sessionId: string) {
    if (!currentSpacePath) return;
    const spacePath = encodeSpacePath(currentSpacePath);
    navigate({
      to: "/space/$spacePath/session/$sessionId",
      params: { spacePath, sessionId },
    });
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="p-4 flex flex-row items-center justify-between">
        <span className="font-semibold">Sessions</span>
        <div className="flex items-center gap-1">
          {currentSpacePath && (
            <>
              <Button
                intent="plain"
                size="sq-sm"
                onPress={handleNewSession}
                isDisabled={isLoading}
              >
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
              </Button>
              <Button
                intent="plain"
                size="sq-sm"
                onPress={handleRefresh}
                isDisabled={isLoading}
              >
                <HugeiconsIcon icon={RefreshIcon} className="size-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarSectionGroup>
          {!currentSpacePath ? (
            <SidebarSection>
              <div className="px-4 py-2 text-muted-fg text-xs">
                Select a space to view sessions
              </div>
            </SidebarSection>
          ) : isLoading ? (
            <SidebarSection>
              <div className="px-4 py-2 text-muted-fg text-xs">
                Loading sessions...
              </div>
            </SidebarSection>
          ) : error ? (
            <SidebarSection>
              <div className="px-4 py-2 text-danger text-xs">
                {error}
              </div>
            </SidebarSection>
          ) : sessions.length === 0 ? (
            <SidebarSection>
              <div className="px-4 py-2 text-muted-fg text-xs">
                No sessions yet
              </div>
            </SidebarSection>
          ) : (
            <SidebarSection label="Active Sessions">
              {sessions.map((session) => (
                <SidebarItem key={session.id} onPress={() => handleSessionClick(session.id)}>
                  <HugeiconsIcon icon={Message01Icon} data-slot="icon" className="size-4" />
                  <SidebarLabel>{session.title || `Session ${session.id.slice(0, 8)}`}</SidebarLabel>
                </SidebarItem>
              ))}
            </SidebarSection>
          )}
        </SidebarSectionGroup>
      </SidebarContent>
    </Sidebar>
  );
}
