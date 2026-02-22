import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";
import { ipcMain } from "electron/main";
import {
  installExtension,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import electronSquirrelStartup from "electron-squirrel-startup";
import { ipcContext } from "@/ipc/context";
import { initializeAutoUpdater } from "@/updater";
import { IPC_CHANNELS } from "./constants";
import { mainLogger } from "@/utils/main-logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inDevelopment = process.env.NODE_ENV === "development";

if (electronSquirrelStartup) {
  app.quit();
}

// Set up crash reporter to capture uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
  mainLogger.error("UNCAUGHT EXCEPTION:", error);
});

// Set up handler for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION:", reason);
  mainLogger.error("UNHANDLED REJECTION:", reason);
  mainLogger.error("Promise:", promise);
});

function createWindow() {
  const preload = path.join(__dirname, "preload.js");
  mainLogger.info("Preload path:", preload);
  mainLogger.info("__dirname:", __dirname);
  mainLogger.info("Preload exists?", fs.existsSync(preload));

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      devTools: inDevelopment,
      contextIsolation: true,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: false,

      preload,
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    trafficLightPosition:
      process.platform === "darwin" ? { x: 5, y: 5 } : undefined,
  });
  ipcContext.setMainWindow(mainWindow);

  // Only open dev tools in development
  if (inDevelopment) {
    mainWindow.webContents.openDevTools();
  }

  // Add error handlers for webContents
  mainWindow.webContents.on("render-process-gone", (event, details) => {
    console.error("Renderer process gone:", details);
  });

  mainWindow.webContents.on("unresponsive", () => {
    console.error("Renderer process unresponsive");
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      console.error("Failed to load:", {
        errorCode,
        errorDescription,
        validatedURL,
      });
    }
  );

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(
      __dirname,
      `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
    );
    mainLogger.info("Loading file:", indexPath);
    mainWindow.loadFile(indexPath);
  }
}

async function installExtensions() {
  try {
    const result = await installExtension(REACT_DEVELOPER_TOOLS);
    mainLogger.info(`Extensions installed successfully: ${result.name}`);
  } catch {
    mainLogger.error("Failed to install extensions");
  }
}

function checkForUpdates() {
  const result = initializeAutoUpdater();
  mainLogger.info(result.message);
}

async function setupORPC() {
  try {
    const { rpcHandler } = await import("./ipc/handler");

    ipcMain.on(IPC_CHANNELS.START_ORPC_SERVER, (event) => {
      try {
        const [serverPort] = event.ports;
        if (!serverPort) {
          mainLogger.error("No server port received in IPC message");
          return;
        }

        mainLogger.info("Received server port, starting it");
        serverPort.start();
        mainLogger.info("Server port started, upgrading with rpcHandler");

        rpcHandler.upgrade(serverPort);
        mainLogger.info("ORPC server upgraded successfully");
      } catch (error) {
        mainLogger.error("Error handling START_ORPC_SERVER event:", error);
      }
    });
  } catch (error) {
    mainLogger.error("Failed to setup ORPC:", error);
    // Don't throw - app can continue without IPC
  }
}

app.whenReady().then(async () => {
  // Set a timeout to detect if initialization hangs
  const initTimeout = setTimeout(() => {
    console.error("❌ [MAIN] Initialization timeout - taking longer than expected");
    mainLogger.error("Initialization timeout - taking longer than expected");
  }, 10000); // 10 second timeout
  
  try {
    console.log("🚀 [MAIN] App starting");
    mainLogger.info("App starting, environment:", process.env.NODE_ENV);
    mainLogger.info(`Log file: ${mainLogger.getLogFilePath()}`);
    
    console.log("🪟 [MAIN] Creating window...");
    try {
      createWindow();
      mainLogger.info("Main window created");
    } catch (error) {
      console.error("❌ [MAIN] Failed to create window:", error);
      mainLogger.error("Failed to create window:", error);
      throw error; // This is fatal
    }
    
    console.log("🔌 [MAIN] Installing extensions...");
    try {
      await installExtensions();
      console.log("✅ [MAIN] Extensions installed");
      mainLogger.info("Extensions installed");
    } catch (error) {
      console.warn("⚠️ [MAIN] Failed to install extensions:", error);
      mainLogger.warn("Failed to install extensions:", error);
    }
    
    console.log("🔄 [MAIN] Checking for updates...");
    try {
      checkForUpdates();
      console.log("✅ [MAIN] Update checker started");
      mainLogger.info("Update checker started");
    } catch (error) {
      console.warn("⚠️ [MAIN] Failed to check for updates:", error);
      mainLogger.warn("Failed to check for updates:", error);
    }
    
    console.log("📡 [MAIN] Setting up ORPC...");
    try {
      await setupORPC();
      console.log("✅ [MAIN] ORPC server set up");
      mainLogger.info("ORPC server set up");
    } catch (error) {
      console.error("❌ [MAIN] Failed to setup ORPC:", error);
      mainLogger.error("Failed to setup ORPC:", error);
      // Don't throw - app can still work without IPC
    }
    
    clearTimeout(initTimeout); // Clear timeout on successful init
    console.log("✅ [MAIN] App initialized successfully");
    mainLogger.info("✅ App initialized successfully");
  } catch (error) {
    clearTimeout(initTimeout);
    console.error("❌ [MAIN] Critical error during app initialization:", error);
    mainLogger.error("❌ Critical error during app initialization:", error);
    if (error instanceof Error) {
      console.error("[MAIN] Stack trace:", error.stack);
      mainLogger.error("Stack trace:", error.stack);
    }
    
    // Show error dialog if app failed to start
    setTimeout(() => {
      const { dialog } = require("electron");
      dialog.showErrorBox(
        "Application Error",
        `Failed to initialize the application.\n\nPlease check the logs at:\n${mainLogger.getLogFilePath()}\n\nError: ${error instanceof Error ? error.message : String(error)}`
      );
      app.quit();
    }, 100);
  }
});

//osX only
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", async () => {
  try {
    const { dbConnectionManager } = await import("./database/connection-manager");
    await dbConnectionManager.disconnectAll();
  } catch (error) {
    mainLogger.warn("Error during cleanup:", error);
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
//osX only ends
