import { type ClientContext, createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/message-port";
import type { RouterClient } from "@orpc/server";
import { logger } from "@/utils/logger";
import { IPC_CHANNELS } from "@/constants";
import type { router } from "./router";

type RPCClient = RouterClient<typeof router>;

class IPCManager {
  private readonly clientPort: MessagePort;
  private readonly serverPort: MessagePort;

  private readonly rpcLink: RPCLink<ClientContext>;

  initialized = false;
  private initPromise: Promise<void> | null = null;

  readonly client: RPCClient;

  constructor() {
    const { port1: clientChannelPort, port2: serverChannelPort } =
      new MessageChannel();
    this.clientPort = clientChannelPort;
    this.serverPort = serverChannelPort;

    this.rpcLink = new RPCLink({
      port: this.clientPort,
    });
    this.client = createORPCClient(this.rpcLink);

    // Add error handler for the port
    this.clientPort.addEventListener("error", (event) => {
      logger.error("MessagePort error event:", event);
    });
  }

  initialize() {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve) => {
      try {
        logger.info("Starting IPC client port");
        this.clientPort.start();
        logger.info("IPC client port started successfully");

        logger.info("Sending ORPC server initialization message with serverPort");
        window.postMessage(IPC_CHANNELS.START_ORPC_SERVER, "*", [
          this.serverPort,
        ]);
        logger.info("ORPC initialization message sent");

        this.initialized = true;

        // Resolve immediately - ORPC upgrade is synchronous
        resolve();
      } catch (error) {
        logger.error("Failed to initialize IPC manager:", error);
        resolve(); // Resolve anyway so the app doesn't hang
      }
    });

    return this.initPromise;
  }

  waitForInit(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }
    return this.initPromise || Promise.resolve();
  }
}

export const ipc = new IPCManager();

// Initialize immediately, but wrapped in try-catch
try {
  logger.info("📡 Module loaded, initializing IPC manager");
  ipc.initialize();
} catch (error) {
  logger.error("❌ Error during IPC manager initialization:", error);
}

// Add a safety check - if still not initialized after 10 seconds, try again
setTimeout(() => {
  try {
    if (!ipc.initialized) {
      logger.warn("⚠️ IPC not initialized after 10s, attempting retry");
      ipc.initialize();
    }
  } catch (error) {
    logger.error("❌ Error during IPC manager retry:", error);
  }
}, 10_000);
