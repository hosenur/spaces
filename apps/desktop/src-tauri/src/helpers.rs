use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

pub const SPACE_METADATA_FILE: &str = ".space_metadata.json";

pub fn space_root() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home_dir.join(".space"))
}

pub fn ensure_space_root() -> Result<PathBuf, String> {
    let space_dir = space_root()?;
    if !space_dir.exists() {
        fs::create_dir_all(&space_dir)
            .map_err(|e| format!("Failed to create ~/.space directory: {}", e))?;
    }
    Ok(space_dir)
}

pub fn validate_space_path(path: &str) -> Result<PathBuf, String> {
    let space_path = PathBuf::from(path);

    let space_root = space_root()?;
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

pub fn normalize_space_path(path: &str) -> Result<String, String> {
    Ok(validate_space_path(path)?.to_string_lossy().to_string())
}

pub fn run_command(
    command: &str,
    args: &[&str],
    current_dir: Option<&Path>,
) -> Result<Output, String> {
    let mut cmd = Command::new(command);
    cmd.args(args);
    if let Some(dir) = current_dir {
        cmd.current_dir(dir);
    }
    cmd.output()
        .map_err(|e| format!("Failed to execute {}: {}", command, e))
}

pub fn run_command_checked(
    command: &str,
    args: &[&str],
    current_dir: Option<&Path>,
    context: &str,
) -> Result<Output, String> {
    let output = run_command(command, args, current_dir)?;
    if output.status.success() {
        Ok(output)
    } else {
        Err(format!(
            "{}: {}",
            context,
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}
