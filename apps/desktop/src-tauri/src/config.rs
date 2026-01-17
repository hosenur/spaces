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

#[tauri::command]
pub fn get_config() -> Result<AppConfig, String> {
    let config_path = get_config_path()?;
    if !config_path.exists() {
        return Ok(AppConfig::default());
    }
    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    let config_path = get_config_path()?;
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))
}

#[tauri::command]
pub fn set_groq_api_key(api_key: String) -> Result<(), String> {
    let mut config = get_config()?;
    config.groq_api_key = Some(api_key);
    save_config(config)
}

#[tauri::command]
pub fn clear_groq_api_key() -> Result<(), String> {
    let mut config = get_config()?;
    config.groq_api_key = None;
    save_config(config)
}

#[tauri::command]
pub fn add_space_to_config(cloned_path: String, random_name: String) -> Result<(), String> {
    let mut config = get_config()?;
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
pub fn set_space_branch_name(cloned_path: String, branch_name: String) -> Result<(), String> {
    let mut config = get_config()?;
    if let Some(space) = config
        .spaces
        .iter_mut()
        .find(|s| s.cloned_path == cloned_path)
    {
        space.branch_name = Some(branch_name);
        save_config(config)?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_space_config(cloned_path: String) -> Result<Option<SpaceConfig>, String> {
    let config = get_config()?;
    Ok(config
        .spaces
        .iter()
        .find(|s| s.cloned_path == cloned_path)
        .cloned())
}

#[tauri::command]
pub fn add_task(cloned_path: String, text: String) -> Result<Task, String> {
    let mut config = get_config()?;
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
        save_config(config)?;
        Ok(task)
    } else {
        Err("Space not found".to_string())
    }
}

#[tauri::command]
pub fn remove_task(cloned_path: String, task_id: String) -> Result<(), String> {
    let mut config = get_config()?;
    if let Some(space) = config
        .spaces
        .iter_mut()
        .find(|s| s.cloned_path == cloned_path)
    {
        space.tasks.retain(|t| t.id != task_id);
        save_config(config)?;
        Ok(())
    } else {
        Err("Space not found".to_string())
    }
}

#[tauri::command]
pub fn toggle_task(cloned_path: String, task_id: String) -> Result<(), String> {
    let mut config = get_config()?;
    if let Some(space) = config
        .spaces
        .iter_mut()
        .find(|s| s.cloned_path == cloned_path)
    {
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
pub fn set_asana_token(token: String) -> Result<(), String> {
    let mut config = get_config()?;
    config.asana_auth = Some(AsanaAuth {
        access_token: token,
    });
    save_config(config)
}

#[tauri::command]
pub fn get_asana_auth() -> Result<Option<AsanaAuth>, String> {
    let config = get_config()?;
    Ok(config.asana_auth)
}

#[tauri::command]
pub fn disconnect_asana() -> Result<(), String> {
    let mut config = get_config()?;
    config.asana_auth = None;
    save_config(config)
}

#[tauri::command]
pub async fn fetch_asana_tasks() -> Result<Vec<AsanaTask>, String> {
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

    let tasks_resp: TasksResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse tasks: {}", e))?;

    Ok(tasks_resp.data)
}
