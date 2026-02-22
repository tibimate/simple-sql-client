import { os } from "@orpc/server";
import { app } from "electron";
import { checkForUpdatesNow, installDownloadedUpdate } from "@/updater";
import { mainLogger } from "@/utils/main-logger";

export const currentPlatfom = os.handler(() => {
  return process.platform;
});

export const appVersion = os.handler(() => {
  return app.getVersion();
});

export const getLogPath = os.handler(() => {
  return mainLogger.getLogFilePath();
});

export const checkForUpdates = os.handler(() => {
  return checkForUpdatesNow();
});

export const installUpdate = os.handler(() => {
  return installDownloadedUpdate();
});
