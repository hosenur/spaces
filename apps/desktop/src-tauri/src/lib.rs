// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use names::Generator;
use rand::Rng;
use uuid::Uuid;

struct AppState {
    opencode_processes: Mutex<HashMap<String, (Child, u16)>>,
}

impl Drop for AppState {
    fn drop(&mut self) {
        if let Ok(mut processes) = self.opencode_processes.lock() {
            for (path, (mut child, _port)) in processes.drain() {
                let _ = child.kill();
                println!("Killed opencode process for {}", path);
            }
        }
    }
}

fn validate_space_path(path: &str) -> Result<PathBuf, String> {
    let space_path = PathBuf::from(path);

    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let space_root = home_dir.join(".space");
    let canonical_path = space_path
        .canonicalize()
        .map_err(|_| "Invalid path")?;
    let canonical_root = space_root
        .canonicalize()
        .map_err(|_| "Space root directory does not exist")?;

    if !canonical_path.starts_with(&canonical_root) {
        return Err("Cannot access paths outside of ~/.space".to_string());
    }

    let metadata_path = canonical_path.join(SPACE_METADATA_FILE);
    if !metadata_path.exists() {
        return Err("Not a valid space directory (missing metadata)".to_string());
    }

    Ok(canonical_path)
}

fn normalize_space_path(path: &str) -> Result<String, String> {
    Ok(validate_space_path(path)?.to_string_lossy().to_string())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn validate_git_folder(path: &str) -> Result<bool, String> {
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
pub struct ClonedRepo {
    pub original_path: String,
    pub original_name: String,
    pub cloned_path: String,
    pub cloned_name: String,
}

const SPACE_METADATA_FILE: &str = ".space_metadata.json";

#[tauri::command]
fn clone_repo_to_space(path: &str) -> Result<ClonedRepo, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let space_dir = home_dir.join(".space");
    
    if !space_dir.exists() {
        fs::create_dir_all(&space_dir)
            .map_err(|e| format!("Failed to create ~/.space directory: {}", e))?;
    }
    
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
    
    // Clone the repository
    let output = Command::new("git")
        .args(["clone", path, cloned_path.to_str().unwrap()])
        .output()
        .map_err(|e| format!("Failed to execute git clone: {}", e))?;
    
    if !output.status.success() {
        return Err(format!(
            "Failed to clone repository: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    
    // Get current branch name before reinit
    let branch_output = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(&cloned_path)
        .output()
        .map_err(|e| format!("Failed to get branch name: {}", e))?;
    
    let branch_name = String::from_utf8_lossy(&branch_output.stdout)
        .trim()
        .to_string();
    let branch_name = if branch_name.is_empty() { "main".to_string() } else { branch_name };
    
    // Move .git to .git-original for diff operations against original
    let git_dir = cloned_path.join(".git");
    let git_original_dir = cloned_path.join(".git-original");
    fs::rename(&git_dir, &git_original_dir)
        .map_err(|e| format!("Failed to rename .git: {}", e))?;
    
    // Initialize a fresh git repo (this gives unique identity for opencode sessions)
    let init_output = Command::new("git")
        .args(["init"])
        .current_dir(&cloned_path)
        .output()
        .map_err(|e| format!("Failed to init git: {}", e))?;
    
    if !init_output.status.success() {
        return Err(format!(
            "Failed to init git: {}",
            String::from_utf8_lossy(&init_output.stderr)
        ));
    }
    
    // Add original as a remote for fetching/diffing
    let remote_output = Command::new("git")
        .args(["remote", "add", "original", path])
        .current_dir(&cloned_path)
        .output()
        .map_err(|e| format!("Failed to add remote: {}", e))?;
    
    if !remote_output.status.success() {
        return Err(format!(
            "Failed to add remote: {}",
            String::from_utf8_lossy(&remote_output.stderr)
        ));
    }
    
    // Create initial commit with all files
    let add_output = Command::new("git")
        .args(["add", "."])
        .current_dir(&cloned_path)
        .output()
        .map_err(|e| format!("Failed to git add: {}", e))?;
    
    if !add_output.status.success() {
        return Err(format!(
            "Failed to git add: {}",
            String::from_utf8_lossy(&add_output.stderr)
        ));
    }
    
    let commit_output = Command::new("git")
        .args(["commit", "-m", &format!("Initial space from {}", original_name)])
        .current_dir(&cloned_path)
        .output()
        .map_err(|e| format!("Failed to git commit: {}", e))?;
    
    if !commit_output.status.success() {
        return Err(format!(
            "Failed to git commit: {}",
            String::from_utf8_lossy(&commit_output.stderr)
        ));
    }
    
    // Rename branch to match original
    if branch_name != "master" {
        Command::new("git")
            .args(["branch", "-M", &branch_name])
            .current_dir(&cloned_path)
            .output()
            .ok();
    }
    
    // Write a unique ID to .git/opencode to make opencode treat this as a separate project
    // opencode uses this file to cache the project ID, and if present, it uses this value
    // instead of computing from git root commit
    let opencode_id_path = cloned_path.join(".git").join("opencode");
    let unique_id = format!("space-{}", cloned_name);
    fs::write(&opencode_id_path, &unique_id)
        .map_err(|e| format!("Failed to write opencode id: {}", e))?;
    
    let repo = ClonedRepo {
        original_path: path.to_string(),
        original_name,
        cloned_path: cloned_path.to_str().unwrap().to_string(),
        cloned_name,
    };
    
    // Save metadata file
    let metadata_path = cloned_path.join(SPACE_METADATA_FILE);
    let metadata_json = serde_json::to_string(&repo)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    fs::write(&metadata_path, metadata_json)
        .map_err(|e| format!("Failed to write metadata file: {}", e))?;
    
    Ok(repo)
}

#[tauri::command]
fn list_cloned_repos() -> Result<Vec<ClonedRepo>, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let space_dir = home_dir.join(".space");
    
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
fn check_uncommitted_changes(path: &str) -> Result<bool, String> {
    let space_path = validate_space_path(path)?;

    // Check for uncommitted changes (staged or unstaged)
    let status_output = Command::new("git")
        .args(["status", "--porcelain"])
        .current_dir(space_path)
        .output()
        .map_err(|e| format!("Failed to execute git status: {}", e))?;

    let has_changes = !String::from_utf8_lossy(&status_output.stdout).trim().is_empty();

    Ok(has_changes)
}

#[tauri::command]
fn archive_space(path: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let canonical_path = validate_space_path(&path)?;
    let canonical_path_str = canonical_path.to_string_lossy().to_string();

    // Kill opencode server if running for this path
    if let Ok(mut processes) = state.opencode_processes.lock() {
        if let Some((mut child, _)) = processes.remove(&canonical_path_str) {
            let _ = child.kill();
        }
    }

    // Remove the directory
    fs::remove_dir_all(canonical_path)
        .map_err(|e| format!("Failed to delete space directory: {}", e))?;

    Ok(())
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
fn get_git_diffs(path: &str) -> Result<Vec<GitDiff>, String> {
    let space_path = validate_space_path(path)?;
    let git_original = space_path.join(".git-original");
    
    // Use .git-original if it exists (for spaces), otherwise use regular .git
    let git_dir_arg = if git_original.exists() {
        format!("--git-dir={}", git_original.to_str().unwrap())
    } else {
        String::new()
    };
    
    let mut diffs: Vec<GitDiff> = Vec::new();
    
    // Get tracked file changes with numstat
    let mut args = vec!["diff", "--numstat"];
    if !git_dir_arg.is_empty() {
        args.insert(0, &git_dir_arg);
    }
    
    let output = Command::new("git")
        .args(&args)
        .current_dir(&space_path)
        .output()
        .map_err(|e| format!("Failed to execute git: {}", e))?;

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
            
            let diff_output = Command::new("git")
                .args(&diff_args)
                .current_dir(&space_path)
                .output();

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
    
    // Get untracked files
    let mut untracked_args = vec!["ls-files", "--others", "--exclude-standard"];
    if !git_dir_arg.is_empty() {
        untracked_args.insert(0, &git_dir_arg);
    }
    
    let untracked_output = Command::new("git")
        .args(&untracked_args)
        .current_dir(&space_path)
        .output();
    
    if let Ok(output) = untracked_output {
        if output.status.success() {
            let untracked_files = String::from_utf8_lossy(&output.stdout);
            for file_path in untracked_files.lines() {
                if file_path.is_empty() {
                    continue;
                }
                
                // Read file content for untracked files
                let full_path = space_path.join(file_path);
                let (content, truncated) = read_text_file_snippet(&full_path, MAX_UNTRACKED_BYTES);
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

#[derive(Serialize)]
pub struct OpenCodeServer {
    pub path: String,
    pub port: u16,
}

#[tauri::command]
fn start_opencode_server(path: String, state: tauri::State<'_, AppState>) -> Result<OpenCodeServer, String> {
    let mut processes = state.opencode_processes.lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let canonical_path = normalize_space_path(&path)?;

    // Check if already running for this path
    if let Some((_child, port)) = processes.get(&canonical_path) {
        return Ok(OpenCodeServer {
            path: canonical_path.clone(),
            port: *port,
        });
    }

    // Generate random port between 10000-60000
    let port: u16 = rand::rng().random_range(10000..60000);

    // Start opencode serve as a child process
    let child = Command::new("opencode")
        .args(["serve", "--port", &port.to_string()])
        .current_dir(&canonical_path)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start opencode server: {}", e))?;

    processes.insert(canonical_path.clone(), (child, port));

    Ok(OpenCodeServer {
        path: canonical_path,
        port,
    })
}

#[tauri::command]
fn get_opencode_port(path: String, state: tauri::State<'_, AppState>) -> Option<u16> {
    let processes = state.opencode_processes.lock().ok()?;
    let canonical_path = normalize_space_path(&path).ok()?;
    processes.get(&canonical_path).map(|(_child, port)| *port)
}

#[tauri::command]
fn get_all_opencode_servers(state: tauri::State<'_, AppState>) -> Vec<OpenCodeServer> {
    let processes = state.opencode_processes.lock().ok();
    match processes {
        Some(procs) => procs.iter().map(|(path, (_, port))| OpenCodeServer {
            path: path.clone(),
            port: *port,
        }).collect(),
        None => Vec::new(),
    }
}

#[tauri::command]
fn start_all_opencode_servers(state: tauri::State<'_, AppState>) -> Result<Vec<OpenCodeServer>, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let space_dir = home_dir.join(".space");

    if !space_dir.exists() {
        return Ok(Vec::new());
    }

    let mut servers = Vec::new();
    let mut processes = state.opencode_processes.lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    let entries = fs::read_dir(&space_dir)
        .map_err(|e| format!("Failed to read ~/.space directory: {}", e))?;

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        let path = entry.path();

        if path.is_dir() {
            let metadata_path = path.join(SPACE_METADATA_FILE);
            if metadata_path.exists() {
                let path_str = path.to_string_lossy().to_string();

                // Skip if already running
                if processes.contains_key(&path_str) {
                    let port = processes.get(&path_str).map(|(_, p)| *p).unwrap();
                    servers.push(OpenCodeServer {
                        path: path_str,
                        port,
                    });
                    continue;
                }

                // Generate random port
                let port: u16 = rand::rng().random_range(10000..60000);

                // Start opencode serve
                match Command::new("opencode")
                    .args(["serve", "--port", &port.to_string()])
                    .current_dir(&path)
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .spawn()
                {
                    Ok(child) => {
                        processes.insert(path_str.clone(), (child, port));
                        servers.push(OpenCodeServer {
                            path: path_str,
                            port,
                        });
                    }
                    Err(_) => continue,
                }
            }
        }
    }

    Ok(servers)
}

const CONFIG_FILE: &str = "config.json";

#[derive(Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub text: String,
    pub completed: bool,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct AsanaAuth {
    pub access_token: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SpaceConfig {
    pub cloned_path: String,
    pub random_name: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub branch_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub created_at: Option<i64>,
    #[serde(default)]
    pub tasks: Vec<Task>,
}

#[derive(Serialize, Deserialize, Default)]
pub struct AppConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub groq_api_key: Option<String>,
    #[serde(default)]
    pub spaces: Vec<SpaceConfig>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub asana_auth: Option<AsanaAuth>,
}

fn get_config_path() -> Result<std::path::PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let space_dir = home_dir.join(".space");
    if !space_dir.exists() {
        fs::create_dir_all(&space_dir)
            .map_err(|e| format!("Failed to create ~/.space directory: {}", e))?;
    }
    Ok(space_dir.join(CONFIG_FILE))
}

#[tauri::command]
fn get_config() -> Result<AppConfig, String> {
    let config_path = get_config_path()?;
    if !config_path.exists() {
        return Ok(AppConfig::default());
    }
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config: {}", e))
}

#[tauri::command]
fn save_config(config: AppConfig) -> Result<(), String> {
    let config_path = get_config_path()?;
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))
}

#[tauri::command]
fn set_groq_api_key(api_key: String) -> Result<(), String> {
    let mut config = get_config()?;
    config.groq_api_key = Some(api_key);
    save_config(config)
}

#[tauri::command]
fn clear_groq_api_key() -> Result<(), String> {
    let mut config = get_config()?;
    config.groq_api_key = None;
    save_config(config)
}

#[tauri::command]
fn add_space_to_config(cloned_path: String, random_name: String) -> Result<(), String> {
    let mut config = get_config()?;
    // Check if space already exists
    if !config.spaces.iter().any(|s| s.cloned_path == cloned_path) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Failed to get current time: {}", e))?
            .as_millis() as i64;
        config.spaces.push(SpaceConfig {
            cloned_path,
            random_name,
            branch_name: None,
            created_at: Some(now),
            tasks: Vec::new(),
        });
        save_config(config)?;
    }
    Ok(())
}

#[tauri::command]
fn set_space_branch_name(cloned_path: String, branch_name: String) -> Result<(), String> {
    let mut config = get_config()?;
    if let Some(space) = config.spaces.iter_mut().find(|s| s.cloned_path == cloned_path) {
        space.branch_name = Some(branch_name);
        save_config(config)?;
    }
    Ok(())
}

#[tauri::command]
fn get_space_config(cloned_path: String) -> Result<Option<SpaceConfig>, String> {
    let config = get_config()?;
    Ok(config.spaces.iter().find(|s| s.cloned_path == cloned_path).cloned())
}

#[tauri::command]
fn add_task(cloned_path: String, text: String) -> Result<Task, String> {
    let mut config = get_config()?;
    let task = Task {
        id: Uuid::new_v4().to_string(),
        text,
        completed: false,
    };
    if let Some(space) = config.spaces.iter_mut().find(|s| s.cloned_path == cloned_path) {
        space.tasks.push(task.clone());
        save_config(config)?;
        Ok(task)
    } else {
        Err("Space not found".to_string())
    }
}

#[tauri::command]
fn remove_task(cloned_path: String, task_id: String) -> Result<(), String> {
    let mut config = get_config()?;
    if let Some(space) = config.spaces.iter_mut().find(|s| s.cloned_path == cloned_path) {
        space.tasks.retain(|t| t.id != task_id);
        save_config(config)?;
        Ok(())
    } else {
        Err("Space not found".to_string())
    }
}

#[tauri::command]
fn toggle_task(cloned_path: String, task_id: String) -> Result<(), String> {
    let mut config = get_config()?;
    if let Some(space) = config.spaces.iter_mut().find(|s| s.cloned_path == cloned_path) {
        if let Some(task) = space.tasks.iter_mut().find(|t| t.id == task_id) {
            task.completed = !task.completed;
            save_config(config)?;
            Ok(())
        } else {
            Err("Task not found".to_string())
        }
    } else {
        Err("Space not found".to_string())
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AsanaTask {
    pub gid: String,
    pub name: String,
    pub completed: bool,
    pub due_on: Option<String>,
}

#[tauri::command]
fn set_asana_token(token: String) -> Result<(), String> {
    let mut config = get_config()?;
    config.asana_auth = Some(AsanaAuth { access_token: token });
    save_config(config)
}

#[tauri::command]
fn get_asana_auth() -> Result<Option<AsanaAuth>, String> {
    let config = get_config()?;
    Ok(config.asana_auth)
}

#[tauri::command]
fn disconnect_asana() -> Result<(), String> {
    let mut config = get_config()?;
    config.asana_auth = None;
    save_config(config)
}

#[tauri::command]
async fn fetch_asana_tasks() -> Result<Vec<AsanaTask>, String> {
    let config = get_config()?;
    let auth = config.asana_auth.ok_or("Not connected to Asana")?;
    
    let client = reqwest::Client::new();
    
    let response = client
        .get("https://app.asana.com/api/1.0/tasks")
        .query(&[
            ("assignee", "me"),
            ("opt_fields", "name,completed,due_on"),
            ("completed_since", "now"),
        ])
        .header("Authorization", format!("Bearer {}", auth.access_token))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch tasks: {}", e))?;
    
    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch tasks: {}", text));
    }
    
    #[derive(Deserialize)]
    struct TasksResponse {
        data: Vec<AsanaTask>,
    }
    
    let tasks_resp: TasksResponse = response.json()
        .await
        .map_err(|e| format!("Failed to parse tasks: {}", e))?;
    
    Ok(tasks_resp.data)
}

fn kill_all_opencode_processes(state: &AppState) {
    if let Ok(mut processes) = state.opencode_processes.lock() {
        for (path, (mut child, _port)) in processes.drain() {
            let _ = child.kill();
            let _ = child.wait();
            println!("Killed opencode process for {}", path);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            opencode_processes: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![greet, validate_git_folder, get_git_diffs, clone_repo_to_space, start_opencode_server, get_opencode_port, list_cloned_repos, get_all_opencode_servers, start_all_opencode_servers, archive_space, check_uncommitted_changes, get_config, save_config, set_groq_api_key, clear_groq_api_key, add_space_to_config, set_space_branch_name, get_space_config, add_task, remove_task, toggle_task, set_asana_token, get_asana_auth, disconnect_asana, fetch_asana_tasks])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.maximize();
                #[cfg(target_os = "macos")]
                {
                    use tauri::window::Color;
                    let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if window.label() == "main" {
                    if let Some(state) = window.try_state::<AppState>() {
                        kill_all_opencode_processes(&state);
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
