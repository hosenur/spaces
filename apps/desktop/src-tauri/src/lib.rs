// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod git;
mod helpers;
mod opencode;
mod spaces;

use tauri::Manager;

use crate::config::{
    add_space_to_config, add_task, clear_groq_api_key, disconnect_asana, fetch_asana_tasks,
    get_asana_auth, get_config, get_space_config, remove_task, save_config, set_asana_token,
    set_groq_api_key, set_space_branch_name, toggle_task,
};
use crate::git::{get_git_diffs, validate_git_folder};
use crate::opencode::{
    get_all_opencode_servers, get_opencode_port, start_all_opencode_servers, start_opencode_server,
    AppState,
};
use crate::spaces::{
    archive_space, check_uncommitted_changes, clone_repo_to_space, list_cloned_repos,
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn spawn_shutdown(app_handle: tauri::AppHandle, window_label: Option<String>) {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app_handle.state::<AppState>();
        state.shutdown_opencode_processes();
        if let Some(label) = window_label {
            if let Some(window) = app_handle.get_webview_window(&label) {
                let _ = window.destroy();
            }
        }
        app_handle.exit(0);
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState::new())
        .on_run_event(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                let state = app_handle.state::<AppState>();
                if !state.try_begin_shutdown() {
                    return;
                }

                api.prevent_exit();
                spawn_shutdown(app_handle.clone(), None);
            }
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() != "main" {
                    return;
                }

                let state = window.state::<AppState>();
                if !state.try_begin_shutdown() {
                    api.prevent_close();
                    return;
                }

                api.prevent_close();

                let app_handle = window.app_handle().clone();
                let window_label = window.label().to_string();
                spawn_shutdown(app_handle, Some(window_label));
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            validate_git_folder,
            get_git_diffs,
            clone_repo_to_space,
            start_opencode_server,
            get_opencode_port,
            list_cloned_repos,
            get_all_opencode_servers,
            start_all_opencode_servers,
            archive_space,
            check_uncommitted_changes,
            get_config,
            save_config,
            set_groq_api_key,
            clear_groq_api_key,
            add_space_to_config,
            set_space_branch_name,
            get_space_config,
            add_task,
            remove_task,
            toggle_task,
            set_asana_token,
            get_asana_auth,
            disconnect_asana,
            fetch_asana_tasks
        ])
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
