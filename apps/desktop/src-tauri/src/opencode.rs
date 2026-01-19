use crate::helpers::{get_extended_path, normalize_space_path, space_root, SPACE_METADATA_FILE};
use rand::Rng;
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};

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

const SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(3);
const SHUTDOWN_POLL_INTERVAL: Duration = Duration::from_millis(100);
const STARTUP_TIMEOUT: Duration = Duration::from_secs(3);
const STARTUP_POLL_INTERVAL: Duration = Duration::from_millis(150);
const HEALTHCHECK_TIMEOUT: Duration = Duration::from_millis(250);

fn is_child_running(child: &mut Child) -> bool {
    match child.try_wait() {
        Ok(Some(_)) => false,
        Ok(None) => true,
        Err(_) => false,
    }
}

fn is_server_healthy(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let timeout = HEALTHCHECK_TIMEOUT;
    let mut stream = match TcpStream::connect_timeout(&addr, timeout) {
        Ok(stream) => stream,
        Err(_) => return false,
    };

    let _ = stream.set_read_timeout(Some(timeout));
    let _ = stream.set_write_timeout(Some(timeout));

    let request = b"GET /session HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
    if stream.write_all(request).is_err() {
        return false;
    }

    let mut buf = [0u8; 12];
    let read_len = match stream.read(&mut buf) {
        Ok(len) => len,
        Err(_) => return false,
    };

    read_len >= 4 && buf[..read_len].starts_with(b"HTTP")
}

fn wait_for_server(child: &mut Child, port: u16) -> bool {
    let start = Instant::now();
    loop {
        if !is_child_running(child) {
            return false;
        }
        if is_server_healthy(port) {
            return true;
        }
        if start.elapsed() >= STARTUP_TIMEOUT {
            return false;
        }
        thread::sleep(STARTUP_POLL_INTERVAL);
    }
}

fn send_terminate(child: &Child) -> bool {
    #[cfg(unix)]
    {
        let pid = child.id() as i32;
        unsafe { libc::kill(pid, libc::SIGTERM) == 0 }
    }
    #[cfg(not(unix))]
    {
        let _ = child;
        false
    }
}

fn wait_for_child_exit(child: &mut Child, timeout: Duration) -> bool {
    let start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_)) => return true,
            Ok(None) => {
                if start.elapsed() >= timeout {
                    return false;
                }
                thread::sleep(SHUTDOWN_POLL_INTERVAL);
            }
            Err(_) => return false,
        }
    }
}

fn shutdown_child_process(path: &str, mut child: Child) {
    if matches!(child.try_wait(), Ok(Some(_))) {
        return;
    }

    let signaled = send_terminate(&child);
    if signaled && wait_for_child_exit(&mut child, SHUTDOWN_TIMEOUT) {
        println!("Stopped opencode process for {}", path);
        return;
    }

    let _ = child.kill();
    let _ = child.wait();
    println!("Killed opencode process for {}", path);
}

pub struct AppState {
    pub(crate) opencode_processes: Mutex<HashMap<String, (Child, u16)>>,
    shutdown_in_progress: AtomicBool,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            opencode_processes: Mutex::new(HashMap::new()),
            shutdown_in_progress: AtomicBool::new(false),
        }
    }

    pub fn try_begin_shutdown(&self) -> bool {
        !self.shutdown_in_progress.swap(true, Ordering::SeqCst)
    }

    pub fn shutdown_opencode_processes(&self) {
        let mut children = Vec::new();
        if let Ok(mut processes) = self.opencode_processes.lock() {
            for (path, (child, _port)) in processes.drain() {
                children.push((path, child));
            }
        }

        for (path, child) in children {
            shutdown_child_process(&path, child);
        }
    }
}

impl Drop for AppState {
    fn drop(&mut self) {
        self.shutdown_opencode_processes();
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
    let canonical_path = normalize_space_path(&path)?;

    loop {
        let mut processes = state
            .opencode_processes
            .lock()
            .map_err(|e| format!("Failed to lock state: {}", e))?;

        if let Some((child, port)) = processes.get_mut(&canonical_path) {
            let port_value = *port;
            if wait_for_server(child, port_value) {
                return Ok(OpenCodeServer {
                    path: canonical_path.clone(),
                    port: port_value,
                });
            }

            if let Some((child, _)) = processes.remove(&canonical_path) {
                drop(processes);
                shutdown_child_process(&canonical_path, child);
            }
            continue;
        }

        let port: u16 = rand::rng().random_range(10000..60000);

        let mut child = Command::new(get_opencode_binary())
            .args(["serve", "--port", &port.to_string()])
            .current_dir(&canonical_path)
            .env("PATH", get_extended_path())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to start opencode server: {}", e))?;

        if !wait_for_server(&mut child, port) {
            shutdown_child_process(&canonical_path, child);
            return Err(format!(
                "Opencode server failed to become ready on port {}",
                port
            ));
        }

        processes.insert(canonical_path.clone(), (child, port));
        return Ok(OpenCodeServer {
            path: canonical_path,
            port,
        });
    }
}

#[tauri::command]
pub fn get_opencode_port(path: String, state: tauri::State<'_, AppState>) -> Option<u16> {
    let canonical_path = normalize_space_path(&path).ok()?;
    let mut processes = state.opencode_processes.lock().ok()?;
    let (child, port) = processes.get_mut(&canonical_path)?;
    let port_value = *port;
    if wait_for_server(child, port_value) {
        return Some(port_value);
    }

    let (child, _) = processes.remove(&canonical_path)?;
    drop(processes);
    shutdown_child_process(&canonical_path, child);
    None
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
                if let Ok(server) = start_opencode_server(path_str, state.clone()) {
                    servers.push(server);
                }
            }
        }
    }

    Ok(servers)
}
