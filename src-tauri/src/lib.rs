use std::process::Command;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Chapter {
    pub id: String,
    pub title: String,
    pub start: f64,
    pub end: Option<f64>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn extract_chapters(file_path: String) -> Result<Vec<Chapter>, String> {
    println!("Extracting chapters from: {}", file_path);
    
    // Run FFmpeg to extract chapter information
    let output = Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_chapters",
            &file_path,
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffprobe: {}. Make sure FFmpeg is installed.", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFprobe failed: {}", stderr));
    }

    let json_output = String::from_utf8(output.stdout)
        .map_err(|e| format!("Invalid UTF-8 output: {}", e))?;

    println!("FFprobe output: {}", json_output);

    // Parse the JSON output
    let parsed: serde_json::Value = serde_json::from_str(&json_output)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

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

            // Try to get chapter title from tags
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
async fn check_ffmpeg() -> Result<String, String> {
    // Check if FFmpeg/FFprobe is available
    let output = Command::new("ffprobe")
        .args(["-version"])
        .output()
        .map_err(|_| "FFmpeg is not installed or not in PATH".to_string())?;

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout);
        let version_line = version.lines().next().unwrap_or("Unknown version");
        Ok(version_line.to_string())
    } else {
        Err("FFprobe is not working correctly".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, extract_chapters, check_ffmpeg])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}