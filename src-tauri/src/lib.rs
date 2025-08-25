// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub start: f64,
    pub end: Option<f64>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn extract_chapters(handle: AppHandle, file_path: String) -> Result<Vec<Chapter>, String> {
    println!("Extracting chapters from: {}", file_path);

    let output = handle.shell()
        .command("ffprobe")
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_chapters",
            &file_path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to set up ffprobe command: {}. Make sure FFmpeg is installed.", e))?;

    if !output.status.success() {
        // Correctly format the error message using debug formatting for status and converting stderr to a string
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFprobe failed with status {:?}: {}", output.status, stderr));
    }

    // `output.stdout` is Vec<u8>, so we convert it to a String
    let json_output = String::from_utf8(output.stdout)
        .map_err(|e| format!("Invalid UTF-8 output from ffprobe: {}", e))?;

    let parsed: serde_json::Value = serde_json::from_str(&json_output)
        .map_err(|e| format!("Failed to parse JSON from ffprobe: {}", e))?;

    let mut chapters = Vec::new();
    if let Some(chapters_array) = parsed["chapters"].as_array() {
        for (index, chapter) in chapters_array.iter().enumerate() {
            let start_time = chapter["start_time"]
                .as_str()
                .and_then(|s| s.parse::<f64>().ok())
                .unwrap_or(0.0);

            let end_time = chapter["end_time"]
                .as_str()
                .and_then(|s| s.parse::<f64>().ok());

            let title = chapter["tags"]["title"]
                .as_str()
                .unwrap_or(&format!("Chapter {}", index + 1))
                .to_string();

            chapters.push(Chapter {
                id: format!("chapter-{}", index),
                title,
                start: start_time,
                end: end_time,
            });
        }
    }

    println!("Found {} chapters", chapters.len());
    Ok(chapters)
}

#[tauri::command]
async fn check_ffmpeg(handle: AppHandle) -> Result<String, String> {
    let output = handle.shell()
        .command("ffprobe")
        .args(["-version"])
        .output()
        .await
        .map_err(|_| "ffprobe command not found. Make sure FFmpeg is installed and in your system's PATH.".to_string())?;

    if output.status.success() {
        // Convert stdout to a string to get the first line
        let version = String::from_utf8_lossy(&output.stdout);
        let version_line = version.lines().next().unwrap_or("Unknown version");
        Ok(version_line.to_string())
    } else {
        // Correctly format the error message by converting stderr to a string
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFprobe execution failed: {}", stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, extract_chapters, check_ffmpeg])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}