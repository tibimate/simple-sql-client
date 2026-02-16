import type * as React from "react";
import { useRef, useState } from "react";
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
  CreateConnectionInput,
} from "@/ipc/connections/schemas";
import { ipc } from "@/ipc/manager";

interface AddConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionType: ConnectionType;
  onConnectionAdded?: (connection: Connection) => void;
}

export function AddConnectionDialog({
  open,
  onOpenChange,
  connectionType,
  onConnectionAdded,
}: AddConnectionDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const connectionData = buildConnectionData(formData, connectionType);

      const createdConnection =
        await ipc.client.connections.create(connectionData);

      formRef.current?.reset();
      onConnectionAdded?.(createdConnection);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create connection"
      );
    } finally {
      setIsSubmitting(false);
      onOpenChange(false);
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
    } catch (_err) {
      setError("Failed to select file");
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-[500px] text-zinc-700 dark:text-zinc-300">
        <form onSubmit={handleSubmit} ref={formRef}>
          <DialogHeader>
            <DialogTitle>
              Add{" "}
              {connectionType.charAt(0).toUpperCase() + connectionType.slice(1)}{" "}
              Connection
            </DialogTitle>
            <DialogDescription>
              Enter the connection details for your {connectionType} database.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="font-medium text-sm" htmlFor="name">
                Connection Name
              </label>
              <Input id="name" name="name" placeholder="My Database" required />
            </div>

            {connectionType === "sqlite" ? (
              <div className="grid gap-2">
                <label className="font-medium text-sm" htmlFor="filePath">
                  Database File
                </label>
                <div className="flex gap-2">
                  <Input
                    id="filePath"
                    name="filePath"
                    placeholder="/path/to/database.db"
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
                    id="host"
                    name="host"
                    placeholder="localhost"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor="port">
                    Port
                  </label>
                  <Input
                    defaultValue={connectionType === "postgres" ? 5432 : 3306}
                    id="port"
                    name="port"
                    placeholder={
                      connectionType === "postgres" ? "5432" : "3306"
                    }
                    required
                    type="number"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor="database">
                    Database
                  </label>
                  <Input
                    id="database"
                    name="database"
                    placeholder="mydb"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor="username">
                    Username
                  </label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="user"
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
                    placeholder="••••••••"
                    type="password"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    className="h-4 w-4"
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
              {isSubmitting ? "Adding..." : "Add Connection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function buildConnectionData(
  formData: FormData,
  type: ConnectionType
): CreateConnectionInput {
  const name = formData.get("name") as string;

  if (type === "sqlite") {
    return {
      type: "sqlite",
      name,
      filePath: formData.get("filePath") as string,
    };
  }

  const host = formData.get("host") as string;
  const port = Number.parseInt(formData.get("port") as string, 10);
  const database = formData.get("database") as string;
  const username = formData.get("username") as string;
  const password = (formData.get("password") as string) || "";
  const ssl = formData.get("ssl") === "on";

  if (type === "postgres") {
    return {
      type: "postgres",
      name,
      host,
      port,
      database,
      username,
      password,
      ssl,
    };
  }

  return {
    type: "mysql",
    name,
    host,
    port,
    database,
    username,
    password,
    ssl,
  };
}
