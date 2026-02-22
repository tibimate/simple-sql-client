import fs from "node:fs";
import path from "node:path";
import { app, autoUpdater, shell } from "electron";
import { UpdateSourceType, updateElectronApp } from "update-electron-app";
import { IPC_CHANNELS } from "@/constants";
import { ipcContext } from "@/ipc/context";
import { mainLogger } from "@/utils/main-logger";

const updateRepository = "tibimate/simple-sql-client";
const latestReleaseApiUrl = `https://api.github.com/repos/${updateRepository}/releases/latest`;
const latestReleasePageUrl = `https://github.com/${updateRepository}/releases/latest`;

let updaterInitialized = false;
let updaterEventsBound = false;
let latestManualDownloadUrl: string | null = null;

export interface UpdateResult {
  started: boolean;
  message: string;
}

export interface InstallUpdateResult extends UpdateResult {
  willQuit: boolean;
}

interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  assets: GitHubReleaseAsset[];
}

function emitUpdaterStatus(payload: { event: string; message: string }) {
  const mainWindow = ipcContext.getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(IPC_CHANNELS.UPDATER_STATUS, payload);
}

function bindUpdaterEvents() {
  if (updaterEventsBound) {
    return;
  }

  autoUpdater.on("update-downloaded", () => {
    const message = "Update downloaded. Restart the app to apply it.";
    mainLogger.info(message);
    emitUpdaterStatus({
      event: "update-downloaded",
      message,
    });
  });

  updaterEventsBound = true;
}

function normalizeVersion(version: string): number[] {
  const cleanedVersion = version.replace(/^v/i, "").split("-")[0] ?? "0.0.0";
  const parts = cleanedVersion
    .split(".")
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10));

  while (parts.length < 3) {
    parts.push(0);
  }

  return parts.map((part) => (Number.isNaN(part) ? 0 : part));
}

function isVersionNewer(candidateVersion: string, currentVersion: string): boolean {
  const candidate = normalizeVersion(candidateVersion);
  const current = normalizeVersion(currentVersion);

  for (let index = 0; index < 3; index += 1) {
    const candidatePart = candidate[index] ?? 0;
    const currentPart = current[index] ?? 0;

    if (candidatePart > currentPart) {
      return true;
    }

    if (candidatePart < currentPart) {
      return false;
    }
  }

  return false;
}

function hasSquirrelUpdateExe(): boolean {
  if (process.platform !== "win32") {
    return false;
  }

  if (typeof process.execPath !== "string" || process.execPath.length === 0) {
    mainLogger.warn("[Updater] process.execPath is invalid for Squirrel detection");
    return false;
  }

  const updateExePath = path.resolve(process.execPath, "..", "..", "Update.exe");
  if (typeof updateExePath !== "string" || updateExePath.length === 0) {
    mainLogger.warn("[Updater] Computed Update.exe path is invalid");
    return false;
  }

  return fs.existsSync(updateExePath);
}

function supportsAutoUpdater(): boolean {
  if (!app.isPackaged) {
    return false;
  }

  if (process.platform === "win32") {
    return hasSquirrelUpdateExe();
  }

  return false;
}

function getAssetExtensionsForPlatform(): string[] {
  if (process.platform === "win32") {
    return [".exe", ".msi", ".nupkg"];
  }

  if (process.platform === "darwin") {
    return [".zip", ".dmg", ".pkg"];
  }

  if (process.platform === "linux") {
    return [".deb", ".rpm", ".appimage", ".tar.gz"];
  }

  return [];
}

function pickBestAssetUrl(assets: GitHubReleaseAsset[]): string | null {
  const extensions = getAssetExtensionsForPlatform();
  mainLogger.info(
    `[Updater] Asset matching platform=${process.platform} extensions=${extensions.join(",") || "none"}`
  );

  if (assets.length === 0) {
    mainLogger.warn("[Updater] Latest release has no assets");
  } else {
    const assetNames = assets.map((asset) => asset.name).join(", ");
    mainLogger.info(`[Updater] Latest release assets: ${assetNames}`);
  }

  for (const extension of extensions) {
    const match = assets.find((asset) =>
      asset.name.toLowerCase().endsWith(extension)
    );
    if (match) {
      mainLogger.info(
        `[Updater] Selected release asset ${match.name} for extension ${extension}`
      );
      return match.browser_download_url;
    }
  }

  mainLogger.warn("[Updater] No platform-specific release asset matched");

  return null;
}

async function fetchLatestRelease(): Promise<GitHubRelease | null> {
  const response = await fetch(latestReleaseApiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "simple-sql-client-updater",
    },
  });

  if (response.status === 404) {
    mainLogger.warn(
      "[Updater] No published GitHub release found (latest endpoint returned 404)"
    );
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch latest release: ${response.status}`);
  }

  return (await response.json()) as GitHubRelease;
}

export function initializeAutoUpdater(): UpdateResult {
  if (!app.isPackaged) {
    return {
      started: false,
      message: "Skipping update check in development",
    };
  }

  if (!supportsAutoUpdater()) {
    return {
      started: false,
      message: "Automatic updater not available for this installer",
    };
  }

  if (updaterInitialized) {
    return {
      started: true,
      message: "Auto updater already initialized",
    };
  }

  bindUpdaterEvents();

  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: updateRepository,
    },
    logger: {
      log: (message: string) => mainLogger.info(message),
      info: (message: string) => mainLogger.info(message),
      warn: (message: string) => mainLogger.warn(message),
      error: (message: string) => mainLogger.error(message),
    },
  });

  updaterInitialized = true;
  return {
    started: true,
    message: "Auto updater initialized",
  };
}

export async function checkForUpdatesNow(): Promise<UpdateResult> {
  if (supportsAutoUpdater()) {
    mainLogger.info(
      `[Updater] Using automatic updater on platform=${process.platform}`
    );
    const initResult = initializeAutoUpdater();
    if (!initResult.started) {
      return {
        started: false,
        message: initResult.message,
      };
    }

    try {
      autoUpdater.checkForUpdates();
      return {
        started: true,
        message: "Checking for updates",
      };
    } catch (error) {
      mainLogger.error("Automatic update check failed:", error);
      return {
        started: false,
        message: "Failed to start update check",
      };
    }
  }

  if (!app.isPackaged) {
    return {
      started: false,
      message: "Skipping update check in development",
    };
  }

  try {
    const latestRelease = await fetchLatestRelease();
    if (!latestRelease) {
      return {
        started: true,
        message: "No published release found yet",
      };
    }

    const currentVersion = app.getVersion();
    const latestVersion = latestRelease.tag_name;
    mainLogger.info(
      `[Updater] Version check current=${currentVersion} latest=${latestVersion}`
    );

    if (!isVersionNewer(latestVersion, currentVersion)) {
      latestManualDownloadUrl = null;
      mainLogger.info("[Updater] No newer release found");
      return {
        started: true,
        message: "You are already on the latest version",
      };
    }

    const bestAssetUrl = pickBestAssetUrl(latestRelease.assets);
    latestManualDownloadUrl = bestAssetUrl ?? latestRelease.html_url;
    mainLogger.info(
      `[Updater] Update available. downloadUrl=${latestManualDownloadUrl}`
    );

    emitUpdaterStatus({
      event: "update-downloaded",
      message: "Update available. Click Install now to download and install.",
    });

    return {
      started: true,
      message: "Update available",
    };
  } catch (error) {
    mainLogger.error("Manual update check failed:", error);
    return {
      started: false,
      message: "Failed to check for updates",
    };
  }
}

export function installDownloadedUpdate(): InstallUpdateResult {
  if (!app.isPackaged) {
    return {
      started: false,
      message: "Install update is only available in packaged builds",
      willQuit: false,
    };
  }

  if (supportsAutoUpdater()) {
    try {
      autoUpdater.quitAndInstall();
      return {
        started: true,
        message: "Installing update",
        willQuit: true,
      };
    } catch (error) {
      mainLogger.error("Failed to install downloaded update:", error);
      return {
        started: false,
        message: "Failed to install update",
        willQuit: false,
      };
    }
  }

  const manualDownloadUrl = latestManualDownloadUrl ?? latestReleasePageUrl;
  try {
    shell.openExternal(manualDownloadUrl);
    return {
      started: true,
      message: "Opened latest release in browser",
      willQuit: false,
    };
  } catch (error) {
    mainLogger.error("Failed to open release page:", error);
    return {
      started: false,
      message: "Failed to open release page",
      willQuit: false,
    };
  }
}
