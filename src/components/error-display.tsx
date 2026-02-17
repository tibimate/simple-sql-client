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
  const errors = logs.filter((log) => log.level === "error" || log.level === "warn");

  useEffect(() => {
    // Try to get the log file path from the main process
    try {
      import("@/ipc/manager").then(({ ipc }) => {
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
      }).catch(() => {
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
    <div className="fixed bottom-4 right-4 max-w-md z-50">
      <div
        className="bg-red-900 text-white p-4 rounded-lg shadow-lg cursor-pointer hover:bg-red-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <span className="font-bold">⚠️ Issues Found ({errors.length})</span>
          <button className="text-xl">{isExpanded ? "−" : "+"}</button>
        </div>

        {isExpanded && (
          <div className="mt-4 bg-red-950 p-3 rounded text-xs max-h-96 overflow-y-auto font-mono space-y-3">
            {errors.map((log, i) => (
              <div key={i} className="pb-2 border-b border-red-800">
                <div className="text-red-300">[{log.timestamp}]</div>
                <div className="text-red-100 font-semibold">{log.message}</div>
                {log.data && (
                  <div className="text-red-200 mt-1 break-words">
                    {typeof log.data === "string" ? log.data : JSON.stringify(log.data)}
                  </div>
                )}
              </div>
            ))}

            {logPath && (
              <div className="mt-4 pt-3 border-t border-red-700">
                <div className="text-yellow-200 text-xs">
                  📋 Logs saved to:
                </div>
                <div className="text-yellow-100 text-xs break-all font-mono mt-1">
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

