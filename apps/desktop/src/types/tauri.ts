export interface GitDiff {
  file_path: string;
  diff: string;
  additions: number;
  deletions: number;
}

export interface GitDiffSummary {
  file_path: string;
  additions: number;
  deletions: number;
  is_untracked: boolean;
}

export interface ClonedRepo {
  original_path: string;
  original_name: string;
  cloned_path: string;
  cloned_name: string;
}

export interface GithubIssue {
  number: number;
  title: string;
  state: string;
  url: string;
  body?: string;
  createdAt: string;
  updatedAt: string;
  labels: GithubLabel[];
  assignees: GithubUser[];
  author?: GithubUser;
}

export interface GithubLabel {
  name: string;
  color: string;
  description?: string | null;
}

export interface GithubUser {
  login: string;
}
