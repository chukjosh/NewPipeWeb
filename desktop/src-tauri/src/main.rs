// This is the Tauri entry point.
// For this project you barely need to touch this file —
// all logic lives in the Ktor backend + React frontend.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running NewPipe desktop app");
}

fn main() {
    run();
}
