import { ipc } from "@/ipc/manager";

export function getPlatform() {
  return ipc.client.app.currentPlatfom();
}

export function getAppVersion() {
  return ipc.client.app.appVersion();
}

export function checkForUpdates() {
  return ipc.client.app.checkForUpdates();
}

export function installUpdate() {
  return ipc.client.app.installUpdate();
}
