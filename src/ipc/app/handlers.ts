import { os } from "@orpc/server";
import { app } from "electron";
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
