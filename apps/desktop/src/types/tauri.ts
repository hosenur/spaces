export interface GitDiff {
  file_path: string;
  diff: string;
  additions: number;
  deletions: number;
}

export interface ClonedRepo {
  original_path: string;
  original_name: string;
  cloned_path: string;
  cloned_name: string;
}
