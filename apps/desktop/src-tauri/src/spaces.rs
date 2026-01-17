use crate::helpers::{
    ensure_space_root, run_command, run_command_checked, space_root, validate_space_path,
    SPACE_METADATA_FILE,
};
use crate::opencode::AppState;
use names::Generator;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize)]
pub struct ClonedRepo {
    pub original_path: String,
    pub original_name: String,
    pub cloned_path: String,
    pub cloned_name: String,
}

#[tauri::command]
pub fn clone_repo_to_space(path: &str) -> Result<ClonedRepo, String> {
    let space_dir = ensure_space_root()?;

    let original_path = Path::new(path);
    let original_name = original_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("repo")
        .to_string();

    let mut generator = Generator::default();
    let random_name = generator.next().unwrap_or_else(|| "unknown".to_string());
    let cloned_name = random_name;
    let cloned_path = space_dir.join(&cloned_name);
    let cloned_path_str = cloned_path
        .to_str()
        .ok_or("Invalid cloned path")?;

    run_command_checked(
        "git",
        &["clone", path, cloned_path_str],
        None,
        "Failed to clone repository",
    )?;

    let branch_output = run_command_checked(
        "git",
        &["rev-parse", "--abbrev-ref", "HEAD"],
        Some(&cloned_path),
        "Failed to get branch name",
    )?;

    let branch_name = String::from_utf8_lossy(&branch_output.stdout)
        .trim()
        .to_string();
    let branch_name = if branch_name.is_empty() {
        "main".to_string()
    } else {
        branch_name
    };

    let git_dir = cloned_path.join(".git");
    let git_original_dir = cloned_path.join(".git-original");
    fs::rename(&git_dir, &git_original_dir)
        .map_err(|e| format!("Failed to rename .git: {}", e))?;

    run_command_checked(
        "git",
        &["init"],
        Some(&cloned_path),
        "Failed to init git",
    )?;

    run_command_checked(
        "git",
        &["remote", "add", "original", path],
        Some(&cloned_path),
        "Failed to add remote",
    )?;

    run_command_checked(
        "git",
        &["add", "."],
        Some(&cloned_path),
        "Failed to git add",
    )?;

    run_command_checked(
        "git",
        &["commit", "-m", &format!("Initial space from {}", original_name)],
        Some(&cloned_path),
        "Failed to git commit",
    )?;

    if branch_name != "master" {
        let _ = run_command(
            "git",
            &["branch", "-M", &branch_name],
            Some(&cloned_path),
        );
    }

    let opencode_id_path = cloned_path.join(".git").join("opencode");
    let unique_id = format!("space-{}", cloned_name);
    fs::write(&opencode_id_path, &unique_id)
        .map_err(|e| format!("Failed to write opencode id: {}", e))?;

    let repo = ClonedRepo {
        original_path: path.to_string(),
        original_name,
        cloned_path: cloned_path_str.to_string(),
        cloned_name,
    };

    let metadata_path = cloned_path.join(SPACE_METADATA_FILE);
    let metadata_json = serde_json::to_string(&repo)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    fs::write(&metadata_path, metadata_json)
        .map_err(|e| format!("Failed to write metadata file: {}", e))?;

    Ok(repo)
}

#[tauri::command]
pub fn list_cloned_repos() -> Result<Vec<ClonedRepo>, String> {
    let space_dir = space_root()?;

    if !space_dir.exists() {
        return Ok(Vec::new());
    }

    let mut repos = Vec::new();
    let entries = fs::read_dir(&space_dir)
        .map_err(|e| format!("Failed to read ~/.space directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            let metadata_path = path.join(SPACE_METADATA_FILE);
            if metadata_path.exists() {
                let metadata_content = fs::read_to_string(&metadata_path)
                    .map_err(|e| format!("Failed to read metadata file: {}", e))?;
                let repo: ClonedRepo = serde_json::from_str(&metadata_content)
                    .map_err(|e| format!("Failed to parse metadata: {}", e))?;
                repos.push(repo);
            }
        }
    }

    Ok(repos)
}

#[tauri::command]
pub fn check_uncommitted_changes(path: &str) -> Result<bool, String> {
    let space_path = validate_space_path(path)?;
    let status_output = run_command_checked(
        "git",
        &["status", "--porcelain"],
        Some(&space_path),
        "Failed to execute git status",
    )?;
    let has_changes = !String::from_utf8_lossy(&status_output.stdout)
        .trim()
        .is_empty();
    Ok(has_changes)
}

#[tauri::command]
pub fn archive_space(path: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let canonical_path = validate_space_path(&path)?;
    let canonical_path_str = canonical_path.to_string_lossy().to_string();

    if let Ok(mut processes) = state.opencode_processes.lock() {
        if let Some((mut child, _)) = processes.remove(&canonical_path_str) {
            let _ = child.kill();
        }
    }

    fs::remove_dir_all(canonical_path)
        .map_err(|e| format!("Failed to delete space directory: {}", e))?;

    Ok(())
}
