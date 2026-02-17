import clsx from "clsx";
import { CheckCircle, Loader, LogOut, RefreshCwIcon, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type {
  MySQLConnection,
  PostgresConnection,
  SQLiteConnection,
} from "@/ipc/connections/schemas";
import { cn } from "@/utils/tailwind";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface ConnectionHeaderProps {
  connection: PostgresConnection | MySQLConnection | SQLiteConnection;
  isConnected: boolean;
  isConnecting: boolean;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefreshTables: () => void;
}

const getConnectionTypeLabel = (
  type: ConnectionHeaderProps["connection"]["type"]
) => {
  if (type === "postgres") {
    return "PostgreSQL";
  }
  if (type === "mysql") {
    return "MySQL";
  }
  return "SQLite";
};

export function ConnectionHeader({
  connection,
  isConnected,
  isConnecting,
  isLoading,
  onConnect,
  onDisconnect,
  onRefreshTables,
}: ConnectionHeaderProps) {
  return (
    <div className="fixed top-8 z-10 h-12 w-full dark:border-zinc-700 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-zinc-300 border-b bg-zinc-100 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-950">
        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 font-bold text-gray-600 text-lg dark:text-zinc-300">
            {connection.name}
            {isConnected && <CheckCircle className="h-5 w-5 text-green-700" />}
            {isConnecting && !isConnected && (
              <Loader className="h-5 w-5 animate-spin text-gray-600 dark:text-zinc-300" />
            )}
            {!(isConnected || isConnecting) && (
              <X className="h-5 w-5 text-red-700" />
            )}
          </h2>
          <div className="flex items-center gap-1 text-gray-600 text-xs dark:text-zinc-400">
            <div>{getConnectionTypeLabel(connection.type)}</div>
            {connection.type !== "sqlite" && (
              <>
                <div>
                  {connection.host}:{connection.port}
                </div>
                <div>
                  {
                    (connection as PostgresConnection | MySQLConnection)
                      .database
                  }
                </div>
              </>
            )}
            {connection.type === "sqlite" && (
              <div>{(connection as SQLiteConnection).filePath}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 pr-64">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger
                  className={cn(buttonVariants({ size: "icon" }))}
                  onClick={onDisconnect}
                >
                  <LogOut className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>Disconnect from database</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  className={cn(buttonVariants({ size: "icon" }))}
                  disabled={isLoading}
                  onClick={onRefreshTables}
                >
                  <RefreshCwIcon
                    className={clsx("h-4 w-4", { "animate-spin": isLoading })}
                  />
                </TooltipTrigger>
                <TooltipContent>Refresh table list</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <Button disabled={isConnecting} onClick={onConnect} size="sm">
              {isConnecting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
