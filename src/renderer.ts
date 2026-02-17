import { logger } from "@/utils/logger";

// Add global error handlers for debugging
logger.info("🚀 Renderer process starting");

window.addEventListener("error", (event) => {
  logger.error("❌ Global error caught:", event.error);
  event.preventDefault();
});

window.addEventListener("unhandledrejection", (event) => {
  logger.error("❌ Unhandled promise rejection:", event.reason);
  // Don't prevent default for all unhandled rejections - let some propagate if needed
});

logger.info("📡 Loading app with IPC...");

// Wrap app loading in try-catch
try {
  // Dynamically import and load the app
  import("@/app")
    .then(() => {
      logger.info("✅ App loaded successfully");
    })
    .catch((error) => {
      logger.error("❌ Failed to load app:", error);
      if (error instanceof Error) {
        logger.error("Stack:", error.stack);
      }
      // Show fallback message
      const appDiv = document.getElementById("app");
      if (appDiv) {
        appDiv.innerHTML = `
          <div style="padding: 20px; color: red; font-family: monospace;">
            <h2>Failed to load application</h2>
            <p>Check the logs for more details.</p>
          </div>
        `;
      }
    });
} catch (error) {
  logger.error("❌ Error during app initialization:", error);
}
