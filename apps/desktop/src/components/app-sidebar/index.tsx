import { type ComponentProps, useState, useEffect, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PackageIcon, GitMergeIcon, Add01Icon, PlugSocketIcon, Archive04Icon, GitForkIcon, CheckListIcon, Settings02Icon, Alert02Icon } from "@hugeicons/core-free-icons";
import { EllipsisHorizontalIcon } from "@heroicons/react/16/solid";
import { open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Hatch } from "ldrs/react";
import "ldrs/react/Hatch.css";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Menu, MenuContent, MenuItem } from "@/components/ui/menu";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
} from "@/components/ui/modal";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarLabel,
  SidebarRail,
  SidebarSection,
  SidebarSectionGroup,
  SidebarItem,
  SidebarLink,
  SidebarMenuTrigger,
} from "@/components/ui/sidebar";
import { encodeSpacePath } from "@/lib/space-path";
import { formatTimeAgo } from "@/lib/time";
import { archiveSpace, checkUncommittedChanges, cloneRepoToSpace, listClonedRepos, validateGitFolder } from "@/lib/tauri";
import { useChatStore, useConfigStore, useConnectionStore } from "@/stores";
import { prefetchIssues } from "@/hooks/use-github-issues";
import type { ClonedRepo } from "@/types/tauri";

interface RepoGroup {
  original_path: string;
  original_name: string;
  clones: ClonedRepo[];
}

export default function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const [repoGroups, setRepoGroups] = useState<RepoGroup[]>([]);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [pendingArchivePath, setPendingArchivePath] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const isSpaceActive = useChatStore((state) => state.isSpaceActive);
  
  const config = useConfigStore((state) => state.config);
  const addSpaceToConfig = useConfigStore((state) => state.addSpaceToConfig);
  
  const removeServer = useConnectionStore((state) => state.removeServer);
  
  function getSpaceDisplayName(clonedPath: string, fallbackName: string): string {
    const spaceConfig = config?.spaces.find((s) => s.cloned_path === clonedPath);
    return spaceConfig?.branch_name || spaceConfig?.random_name || fallbackName;
  }

  function getSpaceCreatedAt(clonedPath: string): number | undefined {
    const spaceConfig = config?.spaces.find((s) => s.cloned_path === clonedPath);
    return spaceConfig?.created_at;
  }

  useEffect(() => {
    async function loadExistingRepos() {
      try {
        const repos = await listClonedRepos();
        const groups = repos.reduce((acc, repo) => {
          const existing = acc.find((g) => g.original_path === repo.original_path);
          if (existing) {
            existing.clones.push(repo);
          } else {
            acc.push({
              original_path: repo.original_path,
              original_name: repo.original_name,
              clones: [repo],
            });
          }
          return acc;
        }, [] as RepoGroup[]);
        setRepoGroups(groups);
      } catch (error) {
        console.error("Failed to load existing repos:", error);
      }
    }
    loadExistingRepos();
  }, []);

  async function handleSelectFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      if (repoGroups.some((group) => group.original_path === selected)) {
        toast.error("This folder has already been added");
        return;
      }
      
      try {
        await validateGitFolder(selected);
        const clonedRepo = await cloneRepoToSpace(selected);
        setRepoGroups((prev) => [
          ...prev,
          {
            original_path: clonedRepo.original_path,
            original_name: clonedRepo.original_name,
            clones: [clonedRepo],
          },
        ]);
        await addSpaceToConfig(clonedRepo.cloned_path, clonedRepo.cloned_name);
        const encodedPath = encodeSpacePath(clonedRepo.cloned_path);
        navigate({ to: "/space/$spacePath/tasks", params: { spacePath: encodedPath } });
      } catch (error) {
        toast.error(error as string);
      }
    }
  }

  async function handleNewSpace(originalPath: string) {
    try {
      const clonedRepo = await cloneRepoToSpace(originalPath);
      setRepoGroups((prev) =>
        prev.map((group) =>
          group.original_path === originalPath
            ? { ...group, clones: [...group.clones, clonedRepo] }
            : group
        )
      );
      await addSpaceToConfig(clonedRepo.cloned_path, clonedRepo.cloned_name);
      const encodedPath = encodeSpacePath(clonedRepo.cloned_path);
      navigate({ to: "/space/$spacePath", params: { spacePath: encodedPath } });
    } catch (error) {
      toast.error(error as string);
    }
  }

  function handleRepoClick(clonedPath: string) {
    const encodedPath = encodeSpacePath(clonedPath);
    navigate({ to: "/space/$spacePath", params: { spacePath: encodedPath } });
  }

  async function handleArchive(clonedPath: string) {
    try {
      const hasChanges = await checkUncommittedChanges(clonedPath);
      if (hasChanges) {
        setPendingArchivePath(clonedPath);
        setArchiveModalOpen(true);
        return;
      }
      await doArchive(clonedPath);
    } catch (error) {
      toast.error(error as string);
    }
  }

  async function doArchive(clonedPath: string) {
    try {
      await archiveSpace(clonedPath);
      removeServer(clonedPath);
      setRepoGroups((prev) =>
        prev
          .map((group) => ({
            ...group,
            clones: group.clones.filter((c) => c.cloned_path !== clonedPath),
          }))
          .filter((group) => group.clones.length > 0)
      );
      toast.success("Space archived successfully");
    } catch (error) {
      toast.error(error as string);
    }
  }

  async function confirmArchive() {
    if (pendingArchivePath) {
      await doArchive(pendingArchivePath);
      setPendingArchivePath(null);
      setArchiveModalOpen(false);
    }
  }

  function handleFork(_clone: ClonedRepo) {
    toast.info("Fork functionality coming soon");
  }

  function handleTasksClick(clonedPath: string) {
    const encodedPath = encodeSpacePath(clonedPath);
    navigate({ to: "/space/$spacePath/tasks", params: { spacePath: encodedPath } });
  }

  function handleIssuesClick(clonedPath: string) {
    const encodedPath = encodeSpacePath(clonedPath);
    navigate({ to: "/space/$spacePath/issues", params: { spacePath: encodedPath } });
  }

  const handleIssuesHover = useCallback((clonedPath: string) => {
    prefetchIssues(clonedPath);
  }, []);

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarSectionGroup>
          {repoGroups.map((group) => (
            <SidebarSection
              key={group.original_path}
              label={
                <>
                  <HugeiconsIcon icon={PackageIcon} className="size-4" />
                  {group.original_name}
                </>
              }
            >
              <SidebarItem
                href="#"
                className="text-muted-fg"
                onPress={() => handleTasksClick(group.clones[0]?.cloned_path || "")}
              >
                <HugeiconsIcon icon={CheckListIcon} data-slot="icon" className="size-4" />
                <SidebarLabel>Tasks</SidebarLabel>
              </SidebarItem>
              <SidebarItem
                href="#"
                className="text-muted-fg"
                onPress={() => handleIssuesClick(group.clones[0]?.cloned_path || "")}
                onHoverStart={() => handleIssuesHover(group.clones[0]?.cloned_path || "")}
              >
                <HugeiconsIcon icon={Alert02Icon} data-slot="icon" className="size-4" />
                <SidebarLabel>Issues</SidebarLabel>
              </SidebarItem>
              <SidebarItem
                href="#"
                className="text-muted-fg"
                onPress={() => handleNewSpace(group.original_path)}
              >
                <HugeiconsIcon icon={Add01Icon} data-slot="icon" className="size-4" />
                <SidebarLabel>New Space</SidebarLabel>
              </SidebarItem>
              {group.clones.map((clone) => {
                const isActive = isSpaceActive(clone.cloned_path);
                const displayName = getSpaceDisplayName(clone.cloned_path, clone.cloned_name);
                const createdAt = getSpaceCreatedAt(clone.cloned_path);
                return (
                <SidebarItem key={clone.cloned_path} tooltip={displayName}>
                  {({ isCollapsed, isFocused }) => (
                    <>
                      <SidebarLink href="#" onPress={() => handleRepoClick(clone.cloned_path)} className="!items-start">
                        <AnimatePresence mode="wait">
                          {isActive ? (
                            <motion.span
                              key="loading"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex size-4 pt-1"
                            >
                              <Hatch size="12" stroke="2" speed="3" color="currentColor" />
                            </motion.span>
                          ) : (
                            <motion.span
                              key="icon"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex pt-1"
                            >
                              <HugeiconsIcon icon={GitMergeIcon} data-slot="icon" className="size-4" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={displayName}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col min-w-0"
                          >
                            <SidebarLabel>{displayName}</SidebarLabel>
                            {createdAt && (
                              <span className="text-[10px] text-muted-fg truncate">
                                {formatTimeAgo(createdAt)}
                              </span>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </SidebarLink>
                      {(!isCollapsed || isFocused) && (
                        <Menu>
                          <SidebarMenuTrigger aria-label="Manage">
                            <EllipsisHorizontalIcon />
                          </SidebarMenuTrigger>
                          <MenuContent
                            popover={{
                              offset: 0,
                              placement: "right top",
                            }}
                          >
                            <MenuItem onAction={() => handleFork(clone)}>
                              <HugeiconsIcon icon={GitForkIcon} className="size-4 mr-2" />
                              Fork
                            </MenuItem>
                            <MenuItem onAction={() => handleArchive(clone.cloned_path)}>
                              <HugeiconsIcon icon={Archive04Icon} className="size-4 mr-2" />
                              Archive
                            </MenuItem>
                          </MenuContent>
                        </Menu>
                      )}
                    </>
                  )}
                </SidebarItem>
                );
              })}
            </SidebarSection>
          ))}
        </SidebarSectionGroup>
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2">
        <Button
          onPress={handleSelectFolder}
          intent="outline"
          className="w-full justify-start gap-x-2"
        >
          <HugeiconsIcon icon={PlugSocketIcon} className="size-4" />
          <span className="truncate in-data-[collapsible=dock]:hidden">
            Connect New Repo
          </span>
        </Button>
        <Button
          onPress={() => navigate({ to: "/settings" })}
          intent="outline"
          className="w-full justify-start gap-x-2"
        >
          <HugeiconsIcon icon={Settings02Icon} className="size-4" />
          <span className="truncate in-data-[collapsible=dock]:hidden">
            Settings
          </span>
        </Button>
      </SidebarFooter>
      <SidebarRail />

      <Modal isOpen={archiveModalOpen} onOpenChange={setArchiveModalOpen}>
        <ModalContent role="alertdialog" size="sm">
          <ModalHeader>
            <ModalTitle>Uncommitted Changes</ModalTitle>
            <ModalDescription>
              This space has uncommitted changes. Are you sure you want to archive it? All changes will be lost.
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <ModalClose>Cancel</ModalClose>
            <Button intent="danger" onPress={confirmArchive}>
              Archive Anyway
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Sidebar>
  );
}
