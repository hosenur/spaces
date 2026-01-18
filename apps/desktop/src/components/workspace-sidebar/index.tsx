import { type ComponentProps } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, RefreshIcon, Add01Icon } from "@hugeicons/core-free-icons";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { LineSpinner } from "ldrs/react";
import "ldrs/react/LineSpinner.css";
import { Button } from "@/components/ui/button";
import { useChatStore, useConnectionStore, useSessionStore } from "@/stores";
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
import type { SessionChatState } from "@/stores/types";

const EMPTY_SESSION_STATES: Record<string, SessionChatState> = {};

export default function WorkspaceSidebar(props: ComponentProps<typeof Sidebar>) {
  const { currentSpacePath, getPort } = useConnectionStore();
  const { getSpaceSessions, fetchSessions, createSession } = useSessionStore();
  const navigate = useNavigate();
  const sessionStates = useChatStore((state) =>
    currentSpacePath ? state.spaces[currentSpacePath]?.sessions ?? EMPTY_SESSION_STATES : EMPTY_SESSION_STATES
  );

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
    if (!currentSpacePath || !port) return;
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

  function isSessionLoading(sessionId: string): boolean {
    const sessionState = sessionStates[sessionId];
    if (!sessionState) return false;
    return sessionState.isSending || sessionState.isAssistantTyping;
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
          ) : (
            <>
              {isLoading ? (
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
                      <div data-slot="icon" className="flex size-4 items-center justify-center">
                        <AnimatePresence mode="wait">
                          {isSessionLoading(session.id) ? (
                            <motion.span
                              key="loading"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex"
                            >
                              <LineSpinner size="16" stroke="2" speed="1" color="currentColor" />
                            </motion.span>
                          ) : (
                            <motion.span
                              key="icon"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex"
                            >
                              <HugeiconsIcon icon={Message01Icon} data-slot="icon" className="size-4" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <SidebarLabel>{session.title || `Session ${session.id.slice(0, 8)}`}</SidebarLabel>
                    </SidebarItem>
                  ))}
                </SidebarSection>
              )}
            </>
          )}
        </SidebarSectionGroup>
      </SidebarContent>
    </Sidebar>
  );
}
