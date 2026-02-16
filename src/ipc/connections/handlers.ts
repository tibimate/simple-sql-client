import { os } from "@orpc/server";
import { dialog } from "electron";
import { z } from "zod";
import { ipcContext } from "../context";
import {
  type Connection,
  CreateConnectionInput,
  SelectFileInput,
} from "./schemas";
import { connectionStorage } from "./storage";

export const getAllConnections = os.handler(() => {
  return connectionStorage.getAllConnections();
});

export const getConnectionById = os
  .input(z.object({ id: z.string().uuid() }))
  .handler(({ input }) => {
    return connectionStorage.getConnectionById(input.id);
  });

export const createConnection = os
  .input(CreateConnectionInput)
  .handler(({ input }) => {
    const connection: Connection = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    } as Connection;

    return connectionStorage.addConnection(connection);
  });

export const updateConnection = os
  .input(
    z.object({
      id: z.string().uuid(),
      updates: z.object({
        name: z.string().optional(),
        host: z.string().optional(),
        port: z.number().optional(),
        database: z.string().optional(),
        username: z.string().optional(),
        password: z.string().optional(),
        ssl: z.boolean().optional(),
        filePath: z.string().optional(),
      }),
    })
  )
  .handler(({ input }) => {
    return connectionStorage.updateConnection(input.id, input.updates);
  });

export const deleteConnection = os
  .input(z.object({ id: z.string().uuid() }))
  .handler(({ input }) => {
    return connectionStorage.deleteConnection(input.id);
  });

export const selectFile = os
  .input(SelectFileInput)
  .handler(async ({ input }) => {
    const mainWindow = ipcContext.getMainWindow();
    if (!mainWindow) {
      throw new Error("Main window not available");
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: input.filters || [
        { name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3"] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });
