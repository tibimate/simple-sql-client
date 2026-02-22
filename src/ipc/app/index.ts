import {
  appVersion,
  checkForUpdates,
  currentPlatfom,
  getLogPath,
  installUpdate,
} from "./handlers";

export const app = {
  currentPlatfom,
  appVersion,
  getLogPath,
  checkForUpdates,
  installUpdate,
};
