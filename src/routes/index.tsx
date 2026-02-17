import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Database, Plus, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Connection } from "@/ipc/connections/schemas";
import { ipc } from "@/ipc/manager";

const DatabaseTypeIcons = {
  postgres: { icon: "🐘", color: "blue", label: "PostgreSQL" },
  mysql: { icon: "🐬", color: "orange", label: "MySQL" },
  sqlite: { icon: "📁", color: "green", label: "SQLite" },
};

function HomePage() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const conns = await ipc.client.connections.getAll();
        setConnections(conns);
      } catch (error) {
        console.error("Failed to load connections:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConnections();
  }, []);

  const handleCreateConnection = () => {
    navigate({ to: "/mysql" });
  };

  const handleConnectionClick = (connection: Connection) => {
    const route = `/${connection.type}/${connection.id}`;
    navigate({ to: route });
  };

  return (
    <ScrollArea className="h-screen overflow-y-auto dark:bg-gradient-to-br dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-800">
      {/* Hero Section */}
      <div className="border-zinc-200 border-b dark:border-zinc-700/50">
        <div className="px-6 pt-4 pb-16">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="flex-1">
              <h1 className="mb-4 font-bold text-4xl text-zinc-800 tracking-tight md:text-5xl dark:text-zinc-300">
                Database Connections
              </h1>
              <p className="max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
                Manage and explore your PostgreSQL, MySQL, and SQLite databases
                from a single, powerful interface.
              </p>
            </div>
            <Button
              className="flex items-center gap-2"
              onClick={handleCreateConnection}
              size="lg"
            >
              <Plus className="inline h-5 w-5" />
              <span className="leading-none">New Connection</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Database Type Quick Cards */}
        <div className="mb-12">
          <h2 className="mb-6 font-semibold text-2xl text-zinc-800 dark:text-white">
            Quick Connect
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                { type: "postgres", label: "PostgreSQL", icon: "🐘" },
                { type: "mysql", label: "MySQL", icon: "🐬" },
                { type: "sqlite", label: "SQLite", icon: "📁" },
              ] as const
            ).map((db) => (
              <button
                className="group flex flex-col items-start gap-4 rounded-lg border border-zinc-400 bg-zinc-100 p-6 transition-all hover:border-blue-600 hover:bg-zinc-200 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                key={db.type}
                onClick={() => navigate({ to: `/${db.type}` })}
                type="button"
              >
                <div className="flex items-center gap-x-4 text-3xl">
                  {db.icon}
                  <h3 className="font-semibold text-lg text-zinc-700 group-hover:text-blue-400 dark:text-zinc-300">
                    {db.label}
                  </h3>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Create a new connection
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

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
            <div className="rounded-lg border border-zinc-100 border-dashed px-8 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
              <Database className="mx-auto mb-4 h-12 w-12 text-zinc-500 dark:text-zinc-400" />
              <h3 className="mb-2 font-semibold text-xl dark:text-zinc-300">
                No connections yet
              </h3>
              <p className="mb-6 text-zinc-600 dark:text-zinc-400">
                Create your first database connection to get started
              </p>
              <Button
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={handleCreateConnection}
              >
                <Plus className="h-4 w-4" />
                Create Connection
              </Button>
            </div>
          )}

          {!isLoading && connections.length > 0 && (
            <div className="grid gap-4">
              {connections.map((connection) => {
                const dbInfo =
                  DatabaseTypeIcons[
                    connection.type as keyof typeof DatabaseTypeIcons
                  ];
                const displayName =
                  connection.type === "sqlite"
                    ? connection.filePath?.split("\\").pop()
                    : `${connection.host}:${connection.port}`;

                return (
                  <button
                    className="group rounded-lg border border-zinc-400 bg-zinc-100 p-5 text-left transition-all hover:border-blue-500/50 hover:bg-zinc-200 hover:shadow-md hover:shadow-zinc-300 dark:border-zinc-700/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 dark:hover:shadow-blue-500/10"
                    key={connection.id}
                    onClick={() => handleConnectionClick(connection)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="text-3xl">{dbInfo.icon}</div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-zinc-700 group-hover:text-blue-400 dark:text-white">
                            {connection.name}
                          </h3>
                          <p className="truncate text-sm text-zinc-400">
                            {displayName}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge
                              className="bg-zinc-700 text-zinc-300"
                              variant="secondary"
                            >
                              {dbInfo.label}
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
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        {connections.length > 0 && (
          <div className="mt-12 rounded-lg border border-zinc-600 bg-zinc-200 p-6 dark:border-zinc-700/30 dark:bg-zinc-800/20">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Connections
                </p>
                <p className="font-bold text-2xl text-zinc-800 dark:text-white">
                  {connections.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Database Types
                </p>
                <p className="flex gap-2">
                  {Array.from(new Set(connections.map((c) => c.type))).map(
                    (type) => {
                      const info =
                        DatabaseTypeIcons[
                          type as keyof typeof DatabaseTypeIcons
                        ];
                      return (
                        <span
                          className="inline-block text-xl"
                          key={type}
                          title={info.label}
                        >
                          {info.icon}
                        </span>
                      );
                    }
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Last Updated
                </p>
                <p className="font-semibold text-sm text-zinc-700 dark:text-white">
                  {connections.length > 0
                    ? new Date(
                        Math.max(
                          ...connections.map((c) =>
                            new Date(c.createdAt).getTime()
                          )
                        )
                      ).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export const Route = createFileRoute("/")({
  component: HomePage,
});
