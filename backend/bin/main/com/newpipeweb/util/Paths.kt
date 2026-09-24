package com.newpipeweb.util

import java.io.File

/** Resolve the downloads directory in order:
 * 1. Environment variable DOWNLOADS_DIR
 * 2. User-configured path from settings.json (via StorageSettingsRepository)
 * 3. System default per OS
 */
fun resolveDownloadsDir(): File = resolvePath(
    envVar = "DOWNLOADS_DIR",
    defaultWindows = "${System.getenv("USERPROFILE")}\\Downloads\\NewPipeWeb",
    defaultMac = "${System.getProperty("user.home")}/Downloads/NewPipeWeb",
    defaultLinux = System.getenv("XDG_DOWNLOAD_DIR")?.let { "${it}/NewPipeWeb" }
        ?: "${System.getProperty("user.home")}/Downloads/NewPipeWeb"
)

/** Resolve the data (database) directory in order:
 * 1. Environment variable DATA_DIR
 * 2. User-configured path from settings.json
 * 3. System default per OS
 */
fun resolveDataDir(): File = resolvePath(
    envVar = "DATA_DIR",
    defaultWindows = "${System.getenv("APPDATA")}\\NewPipeWeb",
    defaultMac = "${System.getProperty("user.home")}/Library/Application Support/NewPipeWeb",
    defaultLinux = System.getenv("XDG_DATA_HOME")?.let { "${it}/NewPipeWeb" }
        ?: "${System.getProperty("user.home")}/.local/share/NewPipeWeb"
)

private fun resolvePath(
    envVar: String,
    defaultWindows: String,
    defaultMac: String,
    defaultLinux: String
): File {
    // 1. Environment variable
    System.getenv(envVar)?.let { return File(it) }

    // 2. Settings repository (custom path)
    val settings = StorageSettingsRepository.load()
    val customPath = when (envVar) {
        "DOWNLOADS_DIR" -> settings?.downloadsDir
        "DATA_DIR" -> settings?.dataDir
        else -> null
    }
    if (!customPath.isNullOrBlank()) return File(customPath)

    // 3. System default based on OS
    val os = System.getProperty("os.name").lowercase()
    val path = when {
        os.contains("win") -> defaultWindows
        os.contains("mac") -> defaultMac
        else -> defaultLinux
    }
    return File(path)
}
