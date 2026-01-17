use crate::helpers::{run_command, validate_space_path};
use serde::Serialize;
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

const MAX_UNTRACKED_BYTES: u64 = 256 * 1024;

fn read_text_file_snippet(path: &Path, max_bytes: u64) -> (Option<String>, bool) {
    let mut file = match fs::File::open(path) {
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

#[tauri::command]
pub fn get_git_diffs(path: &str) -> Result<Vec<GitDiff>, String> {
    let space_path = validate_space_path(path)?;
    let git_original = space_path.join(".git-original");

    let git_dir_arg = if git_original.exists() {
        format!("--git-dir={}", git_original.to_str().unwrap())
    } else {
        String::new()
    };

    let mut diffs: Vec<GitDiff> = Vec::new();

    let mut args = vec!["diff", "--numstat"];
    if !git_dir_arg.is_empty() {
        args.insert(0, &git_dir_arg);
    }

    let output = run_command("git", &args, Some(&space_path))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let numstat = String::from_utf8_lossy(&output.stdout);

    for line in numstat.lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 3 {
            let additions = parts[0].parse::<i32>().unwrap_or(0);
            let deletions = parts[1].parse::<i32>().unwrap_or(0);
            let file_path = parts[2].to_string();

            let mut diff_args = vec!["diff", "--", &file_path];
            if !git_dir_arg.is_empty() {
                diff_args.insert(0, &git_dir_arg);
            }

            let diff_output = run_command("git", &diff_args, Some(&space_path));

            let diff = match diff_output {
                Ok(output) if output.status.success() => {
                    String::from_utf8_lossy(&output.stdout).to_string()
                }
                _ => String::new(),
            };

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
