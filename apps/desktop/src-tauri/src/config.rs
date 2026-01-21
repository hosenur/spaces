use crate::helpers::ensure_space_root;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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
    let space_dir = ensure_space_root()?;
    Ok(space_dir.join(CONFIG_FILE))
}

fn get_config_sync() -> Result<AppConfig, String> {
    let config_path = get_config_path()?;
    if !config_path.exists() {
        return Ok(AppConfig::default());
    }
    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))
}

fn save_config_sync(config: AppConfig) -> Result<(), String> {
    let config_path = get_config_path()?;
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))
}

#[tauri::command]
pub async fn get_config() -> Result<AppConfig, String> {
    tauri::async_runtime::spawn_blocking(get_config_sync)
        .await
        .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn save_config(config: AppConfig) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || save_config_sync(config))
        .await
        .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn set_groq_api_key(api_key: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut config = get_config_sync()?;
        config.groq_api_key = Some(api_key);
        save_config_sync(config)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn clear_groq_api_key() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut config = get_config_sync()?;
        config.groq_api_key = None;
        save_config_sync(config)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn add_space_to_config(cloned_path: String, random_name: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut config = get_config_sync()?;
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
            save_config_sync(config)?;
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn set_space_branch_name(cloned_path: String, branch_name: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut config = get_config_sync()?;
        if let Some(space) = config
            .spaces
            .iter_mut()
            .find(|s| s.cloned_path == cloned_path)
        {
            space.branch_name = Some(branch_name);
            save_config_sync(config)?;
        }
        Ok(())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn get_space_config(cloned_path: String) -> Result<Option<SpaceConfig>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let config = get_config_sync()?;
        Ok(config
            .spaces
            .iter()
            .find(|s| s.cloned_path == cloned_path)
            .cloned())
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn add_task(cloned_path: String, text: String) -> Result<Task, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut config = get_config_sync()?;
        let task = Task {
            id: Uuid::new_v4().to_string(),
            text,
            completed: false,
        };
        if let Some(space) = config
            .spaces
            .iter_mut()
            .find(|s| s.cloned_path == cloned_path)
        {
            space.tasks.push(task.clone());
            save_config_sync(config)?;
            Ok(task)
        } else {
            Err("Space not found".to_string())
        }
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn remove_task(cloned_path: String, task_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut config = get_config_sync()?;
        if let Some(space) = config
            .spaces
            .iter_mut()
            .find(|s| s.cloned_path == cloned_path)
        {
            space.tasks.retain(|t| t.id != task_id);
            save_config_sync(config)?;
            Ok(())
        } else {
            Err("Space not found".to_string())
        }
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn toggle_task(cloned_path: String, task_id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut config = get_config_sync()?;
        if let Some(space) = config
            .spaces
            .iter_mut()
            .find(|s| s.cloned_path == cloned_path)
        {
            if let Some(task) = space.tasks.iter_mut().find(|t| t.id == task_id) {
                task.completed = !task.completed;
                save_config_sync(config)?;
                Ok(())
            } else {
                Err("Task not found".to_string())
            }
        } else {
            Err("Space not found".to_string())
        }
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AsanaTask {
    pub gid: String,
    pub name: String,
    pub completed: bool,
    pub due_on: Option<String>,
}

#[tauri::command]
pub async fn set_asana_token(token: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut config = get_config_sync()?;
        config.asana_auth = Some(AsanaAuth {
            access_token: token,
        });
        save_config_sync(config)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn get_asana_auth() -> Result<Option<AsanaAuth>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let config = get_config_sync()?;
        Ok(config.asana_auth)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn disconnect_asana() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut config = get_config_sync()?;
        config.asana_auth = None;
        save_config_sync(config)
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?
}

#[tauri::command]
pub async fn fetch_asana_tasks() -> Result<Vec<AsanaTask>, String> {
    let config = tauri::async_runtime::spawn_blocking(get_config_sync)
        .await
        .map_err(|e| format!("Task failed: {}", e))??;
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

    let tasks_resp: TasksResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse tasks: {}", e))?;

    Ok(tasks_resp.data)
}
