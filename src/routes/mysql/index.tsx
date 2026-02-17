import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Database, Plus, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MySQLConnection } from "@/ipc/connections/schemas";
import { ipc } from "@/ipc/manager";

function MySQLIndexPage() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<MySQLConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const conns = await ipc.client.connections.getAll();
        const mysqlConnections = conns.filter(
          (c): c is MySQLConnection => c.type === "mysql"
        );
        setConnections(mysqlConnections);
      } catch (error) {
        console.error("Failed to load connections:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConnections();
  }, []);

  const handleCreateConnection = () => {
    navigate({ to: "/mysql/$id", params: { id: "new" } });
  };

  const handleConnectionClick = (connection: MySQLConnection) => {
    navigate({ to: `/mysql/${connection.id}` });
  };

  return (
    <ScrollArea className="h-screen overflow-y-auto dark:bg-gradient-to-br dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-800">
      {/* Hero Section */}
      <div className="border-zinc-200 border-b dark:border-zinc-700/50">
        <div className="px-6 pt-4 pb-16">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="flex-1">
              <h1 className="mb-4 font-bold text-4xl text-zinc-800 tracking-tight md:text-5xl dark:text-zinc-300">
                🐬 MySQL Connections
              </h1>
              <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
                Manage and connect to your MySQL databases. Create new
                connections or access your existing ones.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Connections Section */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-2xl text-zinc-800 dark:text-zinc-300">
              Your Connections
            </h2>
            {connections.length > 0 && (
              <Badge
                className="dark:border-zinc-600 dark:text-zinc-300"
                variant="outline"
              >
                {connections.length}{" "}
                {connections.length === 1 ? "connection" : "connections"}
              </Badge>
            )}
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  className="h-20 animate-pulse rounded-lg dark:bg-zinc-700/50 dark:dark:bg-zinc-600/50"
                  key={i}
                />
              ))}
            </div>
          )}

          {!isLoading && connections.length === 0 && (
            <div className="rounded-lg border border-zinc-400 border-dashed bg-zinc-100 px-8 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
              <Database className="mx-auto mb-4 h-12 w-12 text-zinc-500 dark:text-zinc-400" />
              <h3 className="mb-2 font-semibold text-xl dark:text-zinc-300">
                No connections yet
              </h3>
              <p className="mb-6 text-zinc-600 dark:text-zinc-400">
                Create your first database connection to get started
              </p>
              <Button className="" onClick={handleCreateConnection}>
                <Plus className="h-4 w-4" />
                <span className="leading-none">Create Connection</span>
              </Button>
            </div>
          )}

          {!isLoading && connections.length > 0 && (
            <div className="grid gap-4">
              {connections.map((connection) => (
                <button
                  className="group rounded-lg border border-zinc-400 bg-zinc-100 p-5 text-left transition-all hover:border-blue-500/50 hover:bg-zinc-200 hover:shadow-md hover:shadow-zinc-300 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 dark:hover:shadow-blue-500/10"
                  key={connection.id}
                  onClick={() => handleConnectionClick(connection)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="text-3xl">🐬</div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-zinc-700 group-hover:text-blue-400 dark:text-white">
                          {connection.name}
                        </h3>
                        <p className="truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {connection.host}:{connection.port || 3306}/
                          {connection.database}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge
                            className="bg-zinc-700 text-zinc-300"
                            variant="secondary"
                          >
                            MySQL
                          </Badge>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {new Date(
                              connection.createdAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Server className="h-5 w-5 flex-shrink-0 text-zinc-400 group-hover:text-blue-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

export const Route = createFileRoute("/mysql/")({
  component: MySQLIndexPage,
});
