import { RouterProvider } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { installUpdate } from "./actions/app";
import { updateAppLanguage } from "./actions/language";
import { syncWithLocalTheme } from "./actions/theme";
import { IPC_CHANNELS } from "./constants";
import { router } from "./utils/routes";
import "./localization/i18n";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorDisplay } from "@/components/error-display";
import { logger, type LogEntry } from "@/utils/logger";

export default function App() {
  const { i18n } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    syncWithLocalTheme();
    updateAppLanguage(i18n);
  }, [i18n]);

  // Update logs every second to show real-time errors
  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(logger.getLogs());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleUpdaterEvent = (event: MessageEvent) => {
      if (event.data?.type !== IPC_CHANNELS.UPDATER_STATUS) {
        return;
      }

      const payload = event.data.payload as
        | { event: string; message: string }
        | undefined;

      if (payload?.event === "update-downloaded") {
        toast.success(payload.message, {
          action: {
            label: "Install now",
            onClick: async () => {
              const installingToastId = toast.loading("Installing update...");

              try {
                const result = await installUpdate();
                if (!result.started) {
                  toast.dismiss(installingToastId);
                  toast.error(result.message);
                  return;
                }

                if (!result.willQuit) {
                  toast.dismiss(installingToastId);
                  toast.success(result.message);
                }
              } catch {
                toast.dismiss(installingToastId);
                toast.error("Failed to install update");
              }
            },
          },
          cancel: {
            label: "Later",
            onClick: () => undefined,
          },
        });
      }
    };

    window.addEventListener("message", handleUpdaterEvent);
    return () => {
      window.removeEventListener("message", handleUpdaterEvent);
    };
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <ErrorDisplay logs={logs} />
    </>
  );
}

const container = document.getElementById("app");
if (!container) {
  throw new Error('Root element with id "app" not found');
}
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
      <Toaster />
    </TooltipProvider>
  </React.StrictMode>
);
