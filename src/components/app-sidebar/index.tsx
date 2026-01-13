import { type ComponentProps, useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PackageIcon, GitMergeIcon, Add01Icon, PlugSocketIcon, Archive04Icon, GitForkIcon } from "@hugeicons/core-free-icons";
import { EllipsisHorizontalIcon } from "@heroicons/react/16/solid";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
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

interface ClonedRepo {
  original_path: string;
  original_name: string;
  cloned_path: string;
  cloned_name: string;
}

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

  useEffect(() => {
    async function loadExistingRepos() {
      try {
        const repos = await invoke<ClonedRepo[]>("list_cloned_repos");
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
      // Check if folder is already added
      if (repoGroups.some((group) => group.original_path === selected)) {
        toast.error("This folder has already been added");
        return;
      }
      
      try {
        await invoke("validate_git_folder", { path: selected });
        const clonedRepo = await invoke<ClonedRepo>("clone_repo_to_space", {
          path: selected,
        });
        setRepoGroups((prev) => [
          ...prev,
          {
            original_path: clonedRepo.original_path,
            original_name: clonedRepo.original_name,
            clones: [clonedRepo],
          },
        ]);
        navigate({ to: "/diffs", search: { folderPath: clonedRepo.cloned_path } });
      } catch (error) {
        toast.error(error as string);
      }
    }
  }

  async function handleNewSpace(originalPath: string) {
    try {
      const clonedRepo = await invoke<ClonedRepo>("clone_repo_to_space", {
        path: originalPath,
      });
      setRepoGroups((prev) =>
        prev.map((group) =>
          group.original_path === originalPath
            ? { ...group, clones: [...group.clones, clonedRepo] }
            : group
        )
      );
      // Navigate to space route with base64 encoded path
      const encodedPath = btoa(encodeURIComponent(clonedRepo.cloned_path));
      navigate({ to: "/space/$spacePath", params: { spacePath: encodedPath } });
    } catch (error) {
      toast.error(error as string);
    }
  }

  function handleRepoClick(clonedPath: string) {
    // Navigate to space route with base64 encoded path
    const encodedPath = btoa(encodeURIComponent(clonedPath));
    navigate({ to: "/space/$spacePath", params: { spacePath: encodedPath } });
  }

  async function handleArchive(clonedPath: string) {
    try {
      const hasChanges = await invoke<boolean>("check_uncommitted_changes", { path: clonedPath });
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
      await invoke("archive_space", { path: clonedPath });
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
                onPress={() => handleNewSpace(group.original_path)}
              >
                <HugeiconsIcon icon={Add01Icon} data-slot="icon" className="size-4" />
                <SidebarLabel>New Space</SidebarLabel>
              </SidebarItem>
              {group.clones.map((clone) => (
                <SidebarItem key={clone.cloned_path} tooltip={clone.cloned_name}>
                  {({ isCollapsed, isFocused }) => (
                    <>
                      <SidebarLink href="#" onPress={() => handleRepoClick(clone.cloned_path)}>
                        <HugeiconsIcon icon={GitMergeIcon} data-slot="icon" className="size-4" />
                        <SidebarLabel>{clone.cloned_name}</SidebarLabel>
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
              ))}
            </SidebarSection>
          ))}
        </SidebarSectionGroup>
      </SidebarContent>

      <SidebarFooter className="flex flex-row justify-between gap-4 group-data-[state=collapsed]:flex-col">
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
