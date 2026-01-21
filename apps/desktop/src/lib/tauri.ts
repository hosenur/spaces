import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, AsanaAuth, Task } from "@/types/config";
import type { ClonedRepo, GitDiff, GitDiffSummary, GithubIssue } from "@/types/tauri";

export async function validateGitFolder(path: string): Promise<boolean> {
  return invoke("validate_git_folder", { path });
}

export async function cloneRepoToSpace(path: string): Promise<ClonedRepo> {
  return invoke("clone_repo_to_space", { path });
}

export async function listClonedRepos(): Promise<ClonedRepo[]> {
  return invoke("list_cloned_repos");
}

export async function checkUncommittedChanges(path: string): Promise<boolean> {
  return invoke("check_uncommitted_changes", { path });
}

export async function archiveSpace(path: string): Promise<void> {
  return invoke("archive_space", { path });
}

export async function getGitDiffs(path: string): Promise<GitDiff[]> {
  return invoke("get_git_diffs", { path });
}

export async function getGitDiffSummary(path: string): Promise<GitDiffSummary[]> {
  return invoke("get_git_diff_summary", { path });
}

export async function getGitDiffFile(path: string, filePath: string): Promise<GitDiff> {
  return invoke("get_git_diff_file", { path, filePath });
}

export async function getGithubIssues(path: string): Promise<GithubIssue[]> {
  return invoke("get_github_issues", { path });
}

export async function getGithubIssue(path: string, number: number): Promise<GithubIssue> {
  return invoke("get_github_issue", { path, number });
}

export async function getConfig(): Promise<AppConfig> {
  return invoke("get_config");
}

export async function setGroqApiKey(apiKey: string): Promise<void> {
  return invoke("set_groq_api_key", { apiKey });
}

export async function clearGroqApiKey(): Promise<void> {
  return invoke("clear_groq_api_key");
}

export async function addSpaceToConfig(clonedPath: string, randomName: string): Promise<void> {
  return invoke("add_space_to_config", { clonedPath, randomName });
}

export async function setSpaceBranchName(clonedPath: string, branchName: string): Promise<void> {
  return invoke("set_space_branch_name", { clonedPath, branchName });
}

export async function addTask(clonedPath: string, text: string): Promise<Task> {
  return invoke("add_task", { clonedPath, text });
}

export async function removeTask(clonedPath: string, taskId: string): Promise<void> {
  return invoke("remove_task", { clonedPath, taskId });
}

export async function toggleTask(clonedPath: string, taskId: string): Promise<void> {
  return invoke("toggle_task", { clonedPath, taskId });
}

export async function setAsanaToken(token: string): Promise<void> {
  return invoke("set_asana_token", { token });
}

export async function getAsanaAuth(): Promise<AsanaAuth | null> {
  return invoke("get_asana_auth");
}

export async function disconnectAsana(): Promise<void> {
  return invoke("disconnect_asana");
}
