import type * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type {
  Connection,
  ConnectionType,
  MySQLConnection,
  PostgresConnection,
  SQLiteConnection,
} from "@/ipc/connections/schemas";
import { ipc } from "@/ipc/manager";

interface EditConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: Connection | null;
  onConnectionUpdated?: () => void;
}

type PostgresUpdates = Partial<
  Omit<PostgresConnection, "id" | "type" | "createdAt">
>;
type MySQLUpdates = Partial<Omit<MySQLConnection, "id" | "type" | "createdAt">>;
type SQLiteUpdates = Partial<
  Omit<SQLiteConnection, "id" | "type" | "createdAt">
>;
type ConnectionUpdates = PostgresUpdates | MySQLUpdates | SQLiteUpdates;

export function EditConnectionDialog({
  open,
  onOpenChange,
  connection,
  onConnectionUpdated,
}: EditConnectionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!connection) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const updates = buildConnectionUpdates(formData, connection.type);

      await ipc.client.connections.update({
        id: connection.id,
        updates,
      });

      onConnectionUpdated?.();
      window.dispatchEvent(
        new CustomEvent("connections:updated", {
          detail: { id: connection.id },
        })
      );
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update connection"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectFile = async () => {
    try {
      const filePath = await ipc.client.connections.selectFile({
        filters: [
          { name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (filePath) {
        const fileInput = document.getElementById(
          "filePath"
        ) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = filePath;
        }
      }
    } catch {
      setError("Failed to select file");
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="text-zinc-700 sm:max-w-[500px] dark:text-zinc-300"
        key={connection.id}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Edit {formatConnectionType(connection.type)} Connection
            </DialogTitle>
            <DialogDescription>
              Update the connection details for your {connection.type} database.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="font-medium text-sm" htmlFor="name">
                Connection Name
              </label>
              <Input
                defaultValue={connection.name}
                id="name"
                name="name"
                required
              />
            </div>

            {connection.type === "sqlite" ? (
              <div className="grid gap-2">
                <label className="font-medium text-sm" htmlFor="filePath">
                  Database File
                </label>
                <div className="flex gap-2">
                  <Input
                    defaultValue={connection.filePath}
                    id="filePath"
                    name="filePath"
                    readOnly
                    required
                  />
                  <Button
                    onClick={handleSelectFile}
                    type="button"
                    variant="outline"
                  >
                    Browse
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor="host">
                    Host
                  </label>
                  <Input
                    defaultValue={connection.host}
                    id="host"
                    name="host"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor="port">
                    Port
                  </label>
                  <Input
                    defaultValue={connection.port}
                    id="port"
                    name="port"
                    required
                    type="number"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor="database">
                    Database
                  </label>
                  <Input
                    defaultValue={connection.database}
                    id="database"
                    name="database"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor="username">
                    Username
                  </label>
                  <Input
                    defaultValue={connection.username}
                    id="username"
                    name="username"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor="password">
                    Password
                  </label>
                  <Input
                    id="password"
                    name="password"
                    placeholder="Leave blank to keep current"
                    type="password"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    className="h-4 w-4"
                    defaultChecked={connection.ssl}
                    id="ssl"
                    name="ssl"
                    type="checkbox"
                  />
                  <label className="text-sm" htmlFor="ssl">
                    Use SSL
                  </label>
                </div>
              </>
            )}

            {error && (
              <div className="rounded bg-red-50 p-2 text-red-600 text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function buildConnectionUpdates(
  formData: FormData,
  type: ConnectionType
): ConnectionUpdates {
  const name = getStringField(formData, "name").trim();

  if (type === "sqlite") {
    return {
      name,
      filePath: getStringField(formData, "filePath").trim(),
    } satisfies SQLiteUpdates;
  }

  const updates: PostgresUpdates | MySQLUpdates = {
    name,
    host: getStringField(formData, "host").trim(),
    port: Number.parseInt(getStringField(formData, "port"), 10),
    database: getStringField(formData, "database").trim(),
    username: getStringField(formData, "username").trim(),
    ssl: formData.get("ssl") === "on",
  };

  const password = getStringField(formData, "password").trim();
  if (password) {
    updates.password = password;
  }

  return updates;
}

function formatConnectionType(type: ConnectionType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getStringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
