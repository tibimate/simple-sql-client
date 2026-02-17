import { ipcRenderer } from "electron";
import { IPC_CHANNELS } from "./constants";

console.log("Preload script loaded");

window.addEventListener("message", (event) => {
  console.log("Preload received message:", event.data);

  if (event.data === IPC_CHANNELS.START_ORPC_SERVER) {
    try {
      const [serverPort] = event.ports;
      if (!serverPort) {
        console.error("No server port received in preload");
        return;
      }

      console.log("Forwarding server port to main process");
      ipcRenderer.postMessage(IPC_CHANNELS.START_ORPC_SERVER, null, [
        serverPort,
      ]);
    } catch (error) {
      console.error("Error in preload message handler:", error);
    }
  }
});

console.log("Preload message listener initialized");
