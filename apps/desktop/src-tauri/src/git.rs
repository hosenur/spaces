use crate::helpers::{run_command, validate_space_path, SPACE_METADATA_FILE};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Read;
use std::path::Path;

#[tauri::command]
pub fn validate_git_folder(path: &str) -> Result<bool, String> {
    let git_path = Path::new(path).join(".git");
    if git_path.exists() && git_path.is_dir() {
        Ok(true)
    } else {
        Err("Cannot open non-git folders".to_string())
    }
}

#[derive(Serialize)]
pub struct GitDiff {
    pub file_path: String,
    pub diff: String,
    pub additions: i32,
    pub deletions: i32,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubIssue {
    pub number: i64,
    pub title: String,
    pub state: String,
    pub url: String,
    pub body: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub labels: Vec<GithubLabel>,
    pub assignees: Vec<GithubUser>,
    pub author: Option<GithubUser>,
}

#[derive(Serialize, Deserialize)]
pub struct GithubLabel {
    pub name: String,
    pub color: String,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct GithubUser {
    pub login: String,
}

#[derive(Deserialize)]
struct SpaceMetadata {
    original_path: String,
}

struct GithubRepoRef {
    host: String,
    owner: String,
    name: String,
}

impl GithubRepoRef {
    fn as_cli_repo(&self) -> String {
        if self.host == "github.com" {
            format!("{}/{}", self.owner, self.name)
        } else {
            format!("{}/{}/{}", self.host, self.owner, self.name)
        }
    }
}

const MAX_UNTRACKED_BYTES: u64 = 256 * 1024;

fn read_text_file_snippet(path: &Path, max_bytes: u64) -> (Option<String>, bool) {
    let file = match fs::File::open(path) {
        Ok(file) => file,
        Err(_) => return (None, false),
    };
    let mut buf = Vec::new();
    if file.take(max_bytes + 1).read_to_end(&mut buf).is_err() {
        return (None, false);
    }
    let truncated = buf.len() as u64 > max_bytes;
    if truncated {
        buf.truncate(max_bytes as usize);
    }
    match String::from_utf8(buf) {
        Ok(text) => (Some(text), truncated),
        Err(_) => (None, truncated),
    }
}

fn format_new_file_diff(file_path: &str, content: Option<&str>, truncated: bool) -> String {
    let header = format!(
        "diff --git a/{} b/{}\nnew file mode 100644\n--- /dev/null\n+++ b/{}\n",
        file_path, file_path, file_path
    );

    match content {
        Some(text) => {
            let mut lines: Vec<String> = text.lines().map(|l| format!("+{}", l)).collect();
            if lines.is_empty() {
                lines.push("+<empty file>".to_string());
            }
            if truncated {
                lines.push("+... (truncated)".to_string());
            }
            let line_count = lines.len();
            format!(
                "{}@@ -0,0 +1,{} @@\n{}",
                header,
                line_count,
                lines.join("\n")
            )
        }
        None => format!(
            "{}@@ -0,0 +1,1 @@\n+Binary or unreadable file omitted",
            header
        ),
    }
}

/// Parse a combined git diff output into individual file diffs.
/// Each diff starts with "diff --git a/... b/..." header.
fn parse_combined_diff(diff_output: &str) -> Vec<(String, String)> {
    let mut results = Vec::new();
    let mut current_file: Option<String> = None;
    let mut current_diff = String::new();

    for line in diff_output.lines() {
        if line.starts_with("diff --git ") {
            // Save the previous diff if any
            if let Some(file) = current_file.take() {
                results.push((file, current_diff.clone()));
            }
            current_diff.clear();

            // Extract file path from "diff --git a/path b/path"
            // Handle both normal paths and paths with spaces/special chars
            if let Some(b_part) = line.split(" b/").last() {
                current_file = Some(b_part.to_string());
            }
            current_diff.push_str(line);
            current_diff.push('\n');
        } else if current_file.is_some() {
            current_diff.push_str(line);
            current_diff.push('\n');
        }
    }

    // Don't forget the last file
    if let Some(file) = current_file {
        results.push((file, current_diff));
    }

    results
}

/// Parse git diff --numstat output into a map of file path -> (additions, deletions)
fn parse_numstat(numstat_output: &str) -> std::collections::HashMap<String, (i32, i32)> {
    let mut stats = std::collections::HashMap::new();
    for line in numstat_output.lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 3 {
            let additions = parts[0].parse::<i32>().unwrap_or(0);
            let deletions = parts[1].parse::<i32>().unwrap_or(0);
            let file_path = parts[2].to_string();
            stats.insert(file_path, (additions, deletions));
        }
    }
    stats
}

#[derive(Serialize)]
pub struct GitDiffSummary {
    pub file_path: String,
    pub additions: i32,
    pub deletions: i32,
    pub is_untracked: bool,
}

fn get_git_diff_summary_sync(path: String) -> Result<Vec<GitDiffSummary>, String> {
    let space_path = validate_space_path(&path)?;
    let git_original = space_path.join(".git-original");

    let git_dir_arg = if git_original.exists() {
        format!("--git-dir={}", git_original.to_str().unwrap())
    } else {
        String::new()
    };

    let mut summaries: Vec<GitDiffSummary> = Vec::new();

    let mut numstat_args = vec!["diff", "--numstat"];
    if !git_dir_arg.is_empty() {
        numstat_args.insert(0, &git_dir_arg);
    }

    let numstat_output = run_command("git", &numstat_args, Some(&space_path))?;
    if !numstat_output.status.success() {
        return Err(String::from_utf8_lossy(&numstat_output.stderr).to_string());
    }

    let numstat_str = String::from_utf8_lossy(&numstat_output.stdout);
    for line in numstat_str.lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 3 {
            let additions = parts[0].parse::<i32>().unwrap_or(0);
            let deletions = parts[1].parse::<i32>().unwrap_or(0);
            let file_path = parts[2].to_string();
            summaries.push(GitDiffSummary {
                file_path,
                additions,
                deletions,
                is_untracked: false,
            });
        }
    }

    let mut untracked_args = vec!["ls-files", "--others", "--exclude-standard"];
    if !git_dir_arg.is_empty() {
        untracked_args.insert(0, &git_dir_arg);
    }

    if let Ok(output) = run_command("git", &untracked_args, Some(&space_path)) {
        if output.status.success() {
            let untracked_files = String::from_utf8_lossy(&output.stdout);
            for file_path in untracked_files.lines() {
                if file_path.is_empty() {
                    continue;
                }
                let full_path = space_path.join(file_path);
                let line_count = if full_path.is_file() {
                    let (content, truncated) = read_text_file_snippet(&full_path, MAX_UNTRACKED_BYTES);
                    content.as_deref().map(|text| {
                        let mut count = text.lines().count() as i32;
                        if count == 0 { count = 1; }
                        if truncated { count += 1; }
                        count
                    }).unwrap_or(1)
                } else {
                    1
                };
                summaries.push(GitDiffSummary {
                    file_path: file_path.to_string(),
                    additions: line_count,
                    deletions: 0,
                    is_untracked: true,
                });
            }
        }
    }

    Ok(summaries)
}

#[tauri::command]
pub async fn get_git_diff_summary(path: String) -> Result<Vec<GitDiffSummary>, String> {
    tauri::async_runtime::spawn_blocking(move || get_git_diff_summary_sync(path))
        .await
        .map_err(|e| format!("Task failed: {}", e))?
}

fn get_git_diff_file_sync(path: String, file_path: String) -> Result<GitDiff, String> {
    let space_path = validate_space_path(&path)?;
    let git_original = space_path.join(".git-original");

    let git_dir_arg = if git_original.exists() {
        format!("--git-dir={}", git_original.to_str().unwrap())
    } else {
        String::new()
    };

    let full_path = space_path.join(&file_path);
    let is_untracked = {
        let mut status_args = vec!["ls-files", "--others", "--exclude-standard", "--", &file_path];
        if !git_dir_arg.is_empty() {
            status_args.insert(0, &git_dir_arg);
        }
        let output = run_command("git", &status_args, Some(&space_path))?;
        output.status.success() && !String::from_utf8_lossy(&output.stdout).trim().is_empty()
    };

    if is_untracked {
        let (content, truncated) = read_text_file_snippet(&full_path, MAX_UNTRACKED_BYTES);
        let line_count = content.as_deref().map(|text| {
            let mut count = text.lines().count() as i32;
            if count == 0 { count = 1; }
            if truncated { count += 1; }
            count
        }).unwrap_or(1);
        let diff = format_new_file_diff(&file_path, content.as_deref(), truncated);
        return Ok(GitDiff {
            file_path,
            diff,
            additions: line_count,
            deletions: 0,
        });
    }

    let mut diff_args = vec!["diff", "--", &file_path];
    if !git_dir_arg.is_empty() {
        diff_args.insert(0, &git_dir_arg);
    }

    let diff_output = run_command("git", &diff_args, Some(&space_path))?;
    if !diff_output.status.success() {
        return Err(String::from_utf8_lossy(&diff_output.stderr).to_string());
    }

    let diff = String::from_utf8_lossy(&diff_output.stdout).to_string();

    let mut numstat_args = vec!["diff", "--numstat", "--", &file_path];
    if !git_dir_arg.is_empty() {
        numstat_args.insert(0, &git_dir_arg);
    }

    let numstat_output = run_command("git", &numstat_args, Some(&space_path))?;
    let (additions, deletions) = if numstat_output.status.success() {
        let numstat_str = String::from_utf8_lossy(&numstat_output.stdout);
        let stats = parse_numstat(&numstat_str);
        stats.get(&file_path).copied().unwrap_or((0, 0))
    } else {
        (0, 0)
    };

    Ok(GitDiff {
        file_path,
        diff,
        additions,
        deletions,
    })
}

#[tauri::command]
pub async fn get_git_diff_file(path: String, file_path: String) -> Result<GitDiff, String> {
    tauri::async_runtime::spawn_blocking(move || get_git_diff_file_sync(path, file_path))
        .await
        .map_err(|e| format!("Task failed: {}", e))?
}

fn get_git_diffs_sync(path: String) -> Result<Vec<GitDiff>, String> {
    let space_path = validate_space_path(&path)?;
    let git_original = space_path.join(".git-original");

    let git_dir_arg = if git_original.exists() {
        format!("--git-dir={}", git_original.to_str().unwrap())
    } else {
        String::new()
    };

    let mut diffs: Vec<GitDiff> = Vec::new();

    let mut numstat_args = vec!["diff", "--numstat"];
    if !git_dir_arg.is_empty() {
        numstat_args.insert(0, &git_dir_arg);
    }

    let numstat_output = run_command("git", &numstat_args, Some(&space_path))?;
    if !numstat_output.status.success() {
        return Err(String::from_utf8_lossy(&numstat_output.stderr).to_string());
    }

    let numstat_str = String::from_utf8_lossy(&numstat_output.stdout);
    let file_stats = parse_numstat(&numstat_str);

    let mut diff_args = vec!["diff"];
    if !git_dir_arg.is_empty() {
        diff_args.insert(0, &git_dir_arg);
    }

    let diff_output = run_command("git", &diff_args, Some(&space_path))?;
    if diff_output.status.success() {
        let combined_diff = String::from_utf8_lossy(&diff_output.stdout);
        let parsed_diffs = parse_combined_diff(&combined_diff);

        for (file_path, diff) in parsed_diffs {
            let (additions, deletions) = file_stats.get(&file_path).copied().unwrap_or((0, 0));
            diffs.push(GitDiff {
                file_path,
                diff,
                additions,
                deletions,
            });
        }
    }

    let mut untracked_args = vec!["ls-files", "--others", "--exclude-standard"];
    if !git_dir_arg.is_empty() {
        untracked_args.insert(0, &git_dir_arg);
    }

    let untracked_output = run_command("git", &untracked_args, Some(&space_path));

    if let Ok(output) = untracked_output {
        if output.status.success() {
            let untracked_files = String::from_utf8_lossy(&output.stdout);
            for file_path in untracked_files.lines() {
                if file_path.is_empty() {
                    continue;
                }

                let full_path = space_path.join(file_path);
                let (content, truncated) =
                    read_text_file_snippet(&full_path, MAX_UNTRACKED_BYTES);
                let line_count = content
                    .as_deref()
                    .map(|text| {
                        let mut count = text.lines().count() as i32;
                        if count == 0 {
                            count = 1;
                        }
                        if truncated {
                            count += 1;
                        }
                        count
                    })
                    .unwrap_or(1);

                let diff = format_new_file_diff(file_path, content.as_deref(), truncated);

                diffs.push(GitDiff {
                    file_path: file_path.to_string(),
                    diff,
                    additions: line_count,
                    deletions: 0,
                });
            }
        }
    }

    Ok(diffs)
}

#[tauri::command]
pub async fn get_git_diffs(path: String) -> Result<Vec<GitDiff>, String> {
    tauri::async_runtime::spawn_blocking(move || get_git_diffs_sync(path))
        .await
        .map_err(|e| format!("Task failed: {}", e))?
}

fn is_probably_local_path(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return false;
    }
    if trimmed.starts_with('/')
        || trimmed.starts_with("./")
        || trimmed.starts_with("../")
        || trimmed.starts_with("~/")
        || trimmed.starts_with("file://")
    {
        return true;
    }
    let bytes = trimmed.as_bytes();
    if bytes.len() > 1 && bytes[1] == b':' && bytes[0].is_ascii_alphabetic() {
        return true;
    }
    false
}

fn parse_host_and_path_from_url(remote: &str) -> Option<(String, String)> {
    let after_scheme = remote.splitn(2, "://").nth(1)?;
    let mut rest = after_scheme;
    if let Some(at_index) = rest.rfind('@') {
        rest = &rest[at_index + 1..];
    }
    let mut parts = rest.splitn(2, '/');
    let host = parts.next()?.trim();
    let path = parts.next()?.trim();
    if host.is_empty() || path.is_empty() {
        return None;
    }
    let host = host.split(':').next().unwrap_or(host).to_string();
    Some((host, path.to_string()))
}

fn parse_host_and_path_from_scp(remote: &str) -> Option<(String, String)> {
    let mut rest = remote;
    if let Some(at_index) = rest.rfind('@') {
        rest = &rest[at_index + 1..];
    }
    let mut parts = rest.splitn(2, ':');
    let host = parts.next()?.trim();
    let path = parts.next()?.trim();
    if host.is_empty() || path.is_empty() {
        return None;
    }
    let host = host.split(':').next().unwrap_or(host).to_string();
    Some((host, path.to_string()))
}

fn parse_host_and_path_from_host_path(remote: &str) -> Option<(String, String)> {
    let mut parts = remote.splitn(2, '/');
    let mut host = parts.next()?.trim();
    let path = parts.next()?.trim();
    if host.is_empty() || path.is_empty() {
        return None;
    }
    if let Some(at_index) = host.rfind('@') {
        host = &host[at_index + 1..];
    }
    if !host.contains('.') {
        return None;
    }
    let host = host.split(':').next().unwrap_or(host).to_string();
    Some((host, path.to_string()))
}

fn parse_github_repo_from_remote(remote: &str) -> Option<GithubRepoRef> {
    let trimmed = remote.trim();
    if trimmed.is_empty() || is_probably_local_path(trimmed) {
        return None;
    }
    let cleaned = trimmed.trim_end_matches('/');
    let cleaned = cleaned.strip_suffix(".git").unwrap_or(cleaned);

    let (host, path) = if cleaned.contains("://") {
        parse_host_and_path_from_url(cleaned)?
    } else if cleaned.contains(':') {
        parse_host_and_path_from_scp(cleaned)?
    } else if cleaned.contains('/') {
        parse_host_and_path_from_host_path(cleaned)?
    } else {
        return None;
    };

    let path = path.trim_start_matches('/');
    let path = path.trim_end_matches('/');
    let path = path.strip_suffix(".git").unwrap_or(path);
    let mut segments = path.split('/').filter(|segment| !segment.is_empty());
    let owner = segments.next()?.to_string();
    let name = segments.next()?.to_string();
    if owner.is_empty() || name.is_empty() {
        return None;
    }

    Some(GithubRepoRef { host, owner, name })
}

fn parse_repo_from_remotes_output(output: &str) -> Option<GithubRepoRef> {
    for line in output.lines() {
        let mut parts = line.split_whitespace();
        let _name = match parts.next() {
            Some(name) => name,
            None => continue,
        };
        let url = match parts.next() {
            Some(url) => url,
            None => continue,
        };
        if let Some(repo) = parse_github_repo_from_remote(url) {
            return Some(repo);
        }
    }
    None
}

fn github_repo_from_git_dir(git_dir: &Path, work_dir: &Path) -> Option<GithubRepoRef> {
    let git_dir_arg = format!("--git-dir={}", git_dir.to_string_lossy());
    let output = run_command("git", &[git_dir_arg.as_str(), "remote", "-v"], Some(work_dir)).ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_repo_from_remotes_output(&stdout)
}

fn github_repo_from_local_repo(path: &Path) -> Option<GithubRepoRef> {
    if !path.exists() || !path.is_dir() {
        return None;
    }
    let output = run_command("git", &["remote", "-v"], Some(path)).ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_repo_from_remotes_output(&stdout)
}

fn resolve_github_repo(space_path: &Path) -> Result<GithubRepoRef, String> {
    let metadata_path = space_path.join(SPACE_METADATA_FILE);
    let metadata_content = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("Failed to read space metadata: {}", e))?;
    let metadata: SpaceMetadata = serde_json::from_str(&metadata_content)
        .map_err(|e| format!("Failed to parse space metadata: {}", e))?;

    if let Some(repo) = parse_github_repo_from_remote(&metadata.original_path) {
        return Ok(repo);
    }

    let git_original = space_path.join(".git-original");
    if git_original.exists() {
        if let Some(repo) = github_repo_from_git_dir(&git_original, space_path) {
            return Ok(repo);
        }
    }

    if is_probably_local_path(&metadata.original_path) {
        let original_path = Path::new(&metadata.original_path);
        if let Some(repo) = github_repo_from_local_repo(original_path) {
            return Ok(repo);
        }
    }

    Err("No GitHub remote found for this space. Add a GitHub remote to the original repository or re-clone from GitHub.".to_string())
}

#[tauri::command]
pub async fn get_github_issues(path: &str) -> Result<Vec<GithubIssue>, String> {
    let path = path.to_string();
    tauri::async_runtime::spawn_blocking(move || {
        let space_path = validate_space_path(&path)?;
        let repo = resolve_github_repo(&space_path)?;
        let repo_ref = repo.as_cli_repo();
        let repo_arg = repo_ref.as_str();
        let args = [
            "issue",
            "list",
            "--repo",
            repo_arg,
            "--json",
            "number,title,state,url,labels,assignees,author,createdAt,updatedAt",
            "--state",
            "all",
            "--limit",
            "200",
        ];

        let output = match run_command("gh", &args, Some(&space_path)) {
            Ok(output) => output,
            Err(err) => {
                if err.contains("No such file or directory") {
                    return Err(
                        "GitHub CLI (gh) not found in PATH. Install it and run `gh auth login`."
                            .to_string(),
                    );
                }
                return Err(err);
            }
        };
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        serde_json::from_slice::<Vec<GithubIssue>>(&output.stdout)
            .map_err(|e| format!("Failed to parse issues: {}", e))
    })
    .await
    .map_err(|err| format!("Failed to load GitHub issues: {}", err))?
}

#[tauri::command]
pub async fn get_github_issue(path: &str, number: i64) -> Result<GithubIssue, String> {
    let path = path.to_string();
    tauri::async_runtime::spawn_blocking(move || {
        let space_path = validate_space_path(&path)?;
        let repo = resolve_github_repo(&space_path)?;
        let repo_ref = repo.as_cli_repo();
        let repo_arg = repo_ref.as_str();
        let number_arg = number.to_string();
        let args = [
            "issue",
            "view",
            number_arg.as_str(),
            "--repo",
            repo_arg,
            "--json",
            "number,title,state,url,labels,assignees,author,createdAt,updatedAt,body",
        ];

        let output = match run_command("gh", &args, Some(&space_path)) {
            Ok(output) => output,
            Err(err) => {
                if err.contains("No such file or directory") {
                    return Err(
                        "GitHub CLI (gh) not found in PATH. Install it and run `gh auth login`."
                            .to_string(),
                    );
                }
                return Err(err);
            }
        };
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        serde_json::from_slice::<GithubIssue>(&output.stdout)
            .map_err(|e| format!("Failed to parse issue: {}", e))
    })
    .await
    .map_err(|err| format!("Failed to load GitHub issue: {}", err))?
}
