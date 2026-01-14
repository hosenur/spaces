// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;
use serde::{Deserialize, Serialize};
use names::Generator;
use rand::Rng;

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
    Command::new("git")
        .args(["remote", "add", "original", path])
        .current_dir(&cloned_path)
        .output()
        .map_err(|e| format!("Failed to add remote: {}", e))?;
    
    // Create initial commit with all files
    Command::new("git")
        .args(["add", "."])
        .current_dir(&cloned_path)
        .output()
        .map_err(|e| format!("Failed to git add: {}", e))?;
    
    Command::new("git")
        .args(["commit", "-m", &format!("Initial space from {}", original_name)])
        .current_dir(&cloned_path)
        .output()
        .map_err(|e| format!("Failed to git commit: {}", e))?;
    
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
    let space_path = Path::new(path);
    
    if !space_path.exists() {
        return Err("Space directory does not exist".to_string());
    }
    
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
    let space_path = Path::new(&path);
    
    // Validate path is under ~/.space
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    let space_root = home_dir.join(".space");
    
    let canonical_path = space_path.canonicalize()
        .map_err(|_| "Invalid path")?;
    let canonical_root = space_root.canonicalize()
        .map_err(|_| "Space root directory does not exist")?;
    
    if !canonical_path.starts_with(&canonical_root) {
        return Err("Cannot archive paths outside of ~/.space".to_string());
    }
    
    // Verify it has space metadata
    let metadata_path = space_path.join(SPACE_METADATA_FILE);
    if !metadata_path.exists() {
        return Err("Not a valid space directory (missing metadata)".to_string());
    }
    
    if !space_path.exists() {
        return Err("Space directory does not exist".to_string());
    }
    
    // Kill opencode server if running for this path
    if let Ok(mut processes) = state.opencode_processes.lock() {
        if let Some((mut child, _)) = processes.remove(&path) {
            let _ = child.kill();
        }
    }
    
    // Remove the directory
    fs::remove_dir_all(space_path)
        .map_err(|e| format!("Failed to delete space directory: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn get_git_diffs(path: &str) -> Result<Vec<GitDiff>, String> {
    let space_path = Path::new(path);
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
        .current_dir(path)
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
                .current_dir(path)
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
        .current_dir(path)
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
                let content = fs::read_to_string(&full_path).unwrap_or_default();
                let line_count = content.lines().count() as i32;
                
                // Create a diff-like output for new files
                let diff = format!(
                    "diff --git a/{} b/{}\nnew file mode 100644\n--- /dev/null\n+++ b/{}\n{}",
                    file_path,
                    file_path,
                    file_path,
                    content.lines().map(|l| format!("+{}", l)).collect::<Vec<_>>().join("\n")
                );
                
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
    
    // Check if already running for this path
    if let Some((_child, port)) = processes.get(&path) {
        return Ok(OpenCodeServer {
            path: path.clone(),
            port: *port,
        });
    }
    
    // Generate random port between 10000-60000
    let port: u16 = rand::rng().random_range(10000..60000);
    
    // Start opencode serve as a child process
    let child = Command::new("opencode")
        .args(["serve", "--port", &port.to_string()])
        .current_dir(&path)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start opencode server: {}", e))?;
    
    processes.insert(path.clone(), (child, port));
    
    Ok(OpenCodeServer { path, port })
}

#[tauri::command]
fn get_opencode_port(path: String, state: tauri::State<'_, AppState>) -> Option<u16> {
    let processes = state.opencode_processes.lock().ok()?;
    processes.get(&path).map(|(_child, port)| *port)
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
                let path_str = path.to_str().unwrap().to_string();
                
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
pub struct SpaceConfig {
    pub cloned_path: String,
    pub random_name: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub branch_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub created_at: Option<i64>,
}

#[derive(Serialize, Deserialize, Default)]
pub struct AppConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub groq_api_key: Option<String>,
    #[serde(default)]
    pub spaces: Vec<SpaceConfig>,
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            opencode_processes: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![greet, validate_git_folder, get_git_diffs, clone_repo_to_space, start_opencode_server, get_opencode_port, list_cloned_repos, get_all_opencode_servers, start_all_opencode_servers, archive_space, check_uncommitted_changes, get_config, save_config, set_groq_api_key, add_space_to_config, set_space_branch_name, get_space_config])
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
