use crate::helpers::{normalize_space_path, space_root, SPACE_METADATA_FILE};
use rand::Rng;
use serde::Serialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

/// Get the opencode binary path.
/// First tries to find it in ~/.opencode/bin, then falls back to PATH lookup.
fn get_opencode_binary() -> String {
    if let Some(home) = dirs::home_dir() {
        let opencode_path = home.join(".opencode").join("bin").join("opencode");
        if opencode_path.exists() {
            return opencode_path.to_string_lossy().to_string();
        }
    }
    // Fall back to just "opencode" and hope it's in PATH
    "opencode".to_string()
}

/// Get an extended PATH that includes common binary directories.
/// This is needed because macOS apps launched from Finder don't inherit the shell's PATH.
fn get_extended_path() -> String {
    let current_path = env::var("PATH").unwrap_or_default();
    let home = dirs::home_dir().map(|h| h.to_string_lossy().to_string()).unwrap_or_default();

    let extra_paths = [
        format!("{}/.opencode/bin", home),
        format!("{}/.local/bin", home),
        format!("{}/bin", home),
        "/usr/local/bin".to_string(),
        "/opt/homebrew/bin".to_string(),
    ];

    let mut all_paths: Vec<String> = extra_paths.into_iter().collect();
    if !current_path.is_empty() {
        all_paths.push(current_path);
    }
    all_paths.join(":")
}

pub struct AppState {
    pub(crate) opencode_processes: Mutex<HashMap<String, (Child, u16)>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            opencode_processes: Mutex::new(HashMap::new()),
        }
    }
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

#[derive(Serialize)]
pub struct OpenCodeServer {
    pub path: String,
    pub port: u16,
}

#[tauri::command]
pub fn start_opencode_server(
    path: String,
    state: tauri::State<'_, AppState>,
) -> Result<OpenCodeServer, String> {
    let mut processes = state
        .opencode_processes
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    let canonical_path = normalize_space_path(&path)?;

    if let Some((_child, port)) = processes.get(&canonical_path) {
        return Ok(OpenCodeServer {
            path: canonical_path.clone(),
            port: *port,
        });
    }

    let port: u16 = rand::rng().random_range(10000..60000);

    let child = Command::new(get_opencode_binary())
        .args(["serve", "--port", &port.to_string()])
        .current_dir(&canonical_path)
        .env("PATH", get_extended_path())
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
pub fn get_opencode_port(path: String, state: tauri::State<'_, AppState>) -> Option<u16> {
    let processes = state.opencode_processes.lock().ok()?;
    let canonical_path = normalize_space_path(&path).ok()?;
    processes.get(&canonical_path).map(|(_child, port)| *port)
}

#[tauri::command]
pub fn get_all_opencode_servers(state: tauri::State<'_, AppState>) -> Vec<OpenCodeServer> {
    let processes = state.opencode_processes.lock().ok();
    match processes {
        Some(procs) => procs
            .iter()
            .map(|(path, (_, port))| OpenCodeServer {
                path: path.clone(),
                port: *port,
            })
            .collect(),
        None => Vec::new(),
    }
}

#[tauri::command]
pub fn start_all_opencode_servers(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<OpenCodeServer>, String> {
    let space_dir = space_root()?;

    if !space_dir.exists() {
        return Ok(Vec::new());
    }

    let mut servers = Vec::new();
    let mut processes = state
        .opencode_processes
        .lock()
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

                if processes.contains_key(&path_str) {
                    let port = processes.get(&path_str).map(|(_, p)| *p).unwrap();
                    servers.push(OpenCodeServer {
                        path: path_str,
                        port,
                    });
                    continue;
                }

                let port: u16 = rand::rng().random_range(10000..60000);

                match Command::new(get_opencode_binary())
                    .args(["serve", "--port", &port.to_string()])
                    .current_dir(&path)
                    .env("PATH", get_extended_path())
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
