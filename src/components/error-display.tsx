import { useEffect, useState } from "react";

interface ErrorDisplayProps {
  logs: Array<{
    timestamp: string;
    level: "info" | "warn" | "error" | "debug";
    message: string;
    data?: unknown;
  }>;
}

export function ErrorDisplay({ logs }: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logPath, setLogPath] = useState<string>("");
  const errors = logs.filter(
    (log) => log.level === "error" || log.level === "warn"
  );

  useEffect(() => {
    // Try to get the log file path from the main process
    try {
      import("@/ipc/manager")
        .then(({ ipc }) => {
          if (ipc?.client?.app?.getLogPath) {
            ipc.client.app
              .getLogPath()
              .then((path: string) => {
                setLogPath(path);
              })
              .catch(() => {
                // Silently fail if we can't get the path
              });
          }
        })
        .catch(() => {
          // IPC not ready yet
        });
    } catch {
      // Silently fail
    }
  }, []);

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 max-w-md">
      <div
        className="cursor-pointer rounded-lg bg-red-900 p-4 text-white shadow-lg hover:bg-red-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <span className="font-bold">⚠️ Issues Found ({errors.length})</span>
          <button className="text-xl">{isExpanded ? "−" : "+"}</button>
        </div>

        {isExpanded && (
          <div className="mt-4 max-h-96 space-y-3 overflow-y-auto rounded bg-red-950 p-3 font-mono text-xs">
            {errors.map((log, i) => (
              <div className="border-red-800 border-b pb-2" key={i}>
                <div className="text-red-300">[{log.timestamp}]</div>
                <div className="font-semibold text-red-100">{log.message}</div>
                {log.data !== undefined && log.data !== null && (
                  <div className="mt-1 break-words text-red-200">
                    {typeof log.data === "string"
                      ? log.data
                      : JSON.stringify(log.data)}
                  </div>
                )}
              </div>
            ))}

            {logPath && (
              <div className="mt-4 border-red-700 border-t pt-3">
                <div className="text-xs text-yellow-200">📋 Logs saved to:</div>
                <div className="mt-1 break-all font-mono text-xs text-yellow-100">
                  {logPath}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
