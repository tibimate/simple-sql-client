import type { Database as SQLiteDatabase } from "better-sqlite3";
import type { Connection as MySQLConnection } from "mysql2/promise";
import type { Pool } from "pg";
import type { Connection } from "@/ipc/connections/schemas";
import { mainLogger } from "@/utils/main-logger";
import {
  connectMySQL,
  disconnectMySQL,
  executeMySQLQuery,
  getMySQLTableSchema,
  listMySQLTables,
} from "./connections/mysql";
import {
  connectPostgres,
  disconnectPostgres,
  executePostgresQuery,
  getPostgresTableSchema,
  listPostgresTables,
} from "./connections/postgres";
import {
  connectSQLite,
  disconnectSQLite,
  executeSQLiteQuery,
  getSQLiteTableSchema,
  listSQLiteTables,
} from "./connections/sqlite";

type DatabaseConnection = Pool | MySQLConnection | SQLiteDatabase;

interface ActiveConnection {
  id: string;
  config: Connection;
  client: DatabaseConnection;
  connectedAt: Date;
}

class DatabaseConnectionManager {
  private readonly connections: Map<string, ActiveConnection> = new Map();

  async connect(connectionConfig: Connection): Promise<void> {
    // If already connected, return
    if (this.connections.has(connectionConfig.id)) {
      mainLogger.warn("Connection already exists", connectionConfig.id);
      return;
    }

    try {
      mainLogger.info("Connecting to database", {
        id: connectionConfig.id,
        type: connectionConfig.type,
        name: connectionConfig.name,
      });
      
      let client: DatabaseConnection;

      switch (connectionConfig.type) {
        case "postgres":
          client = await connectPostgres(connectionConfig);
          break;
        case "mysql":
          client = await connectMySQL(connectionConfig);
          break;
        case "sqlite":
          client = await connectSQLite(connectionConfig);
          break;
      }

      this.connections.set(connectionConfig.id, {
        id: connectionConfig.id,
        config: connectionConfig,
        client,
        connectedAt: new Date(),
      });
      
      mainLogger.info("Database connection established", connectionConfig.id);
    } catch (error) {
      mainLogger.error("Database connection failed", error);
      throw new Error(
        `Failed to connect to database: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async disconnect(connectionId: string): Promise<void> {
    const activeConnection = this.connections.get(connectionId);
    if (!activeConnection) {
      return;
    }

    try {
      const { client, config } = activeConnection;

      switch (config.type) {
        case "postgres":
          await disconnectPostgres(client as Pool);
          break;
        case "mysql":
          await disconnectMySQL(client as MySQLConnection);
          break;
        case "sqlite":
          await disconnectSQLite(client as SQLiteDatabase);
          break;
      }

      this.connections.delete(connectionId);
    } catch (error) {
      console.error("Error disconnecting:", error);
      // Remove from connections even if disconnect fails
      this.connections.delete(connectionId);
    }
  }

  isConnected(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  getConnection(connectionId: string): ActiveConnection | undefined {
    return this.connections.get(connectionId);
  }

  async listTables(connectionId: string): Promise<string[]> {
    const activeConnection = this.connections.get(connectionId);
    if (!activeConnection) {
      throw new Error("Not connected to database");
    }

    const { client, config } = activeConnection;

    try {
      switch (config.type) {
        case "postgres":
          return await listPostgresTables(client as Pool);
        case "mysql":
          return await listMySQLTables(client as MySQLConnection);
        case "sqlite":
          return await listSQLiteTables(client as SQLiteDatabase);
      }
    } catch (error) {
      throw new Error(
        `Failed to list tables: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async executeQuery(
    connectionId: string,
    query: string
  ): Promise<{ columns: string[]; rows: unknown[] }> {
    const activeConnection = this.connections.get(connectionId);
    if (!activeConnection) {
      throw new Error("Not connected to database");
    }

    const { client, config } = activeConnection;

    try {
      switch (config.type) {
        case "postgres":
          return await executePostgresQuery(client as Pool, query);
        case "mysql":
          return await executeMySQLQuery(client as MySQLConnection, query);
        case "sqlite":
          return await executeSQLiteQuery(client as SQLiteDatabase, query);
      }
    } catch (error) {
      throw new Error(
        `Query execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async getTableSchema(
    connectionId: string,
    tableName: string
  ): Promise<
    Array<{
      name: string;
      type: string;
      nullable: boolean;
      autoIncrement: boolean;
      primaryKey: boolean;
      foreignKey?: { table: string; column: string } | null;
    }>
  > {
    const activeConnection = this.connections.get(connectionId);
    if (!activeConnection) {
      throw new Error("Not connected to database");
    }

    const { client, config } = activeConnection;

    try {
      switch (config.type) {
        case "postgres":
          return await getPostgresTableSchema(client as Pool, tableName);
        case "mysql":
          return await getMySQLTableSchema(
            client as MySQLConnection,
            tableName
          );
        case "sqlite":
          return await getSQLiteTableSchema(
            client as SQLiteDatabase,
            tableName
          );
      }
    } catch (error) {
      throw new Error(
        `Failed to get table schema: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  disconnectAll(): void {
    for (const [connectionId] of this.connections) {
      this.disconnect(connectionId).catch((error) => {
        console.error(`Failed to disconnect ${connectionId}:`, error);
      });
    }
  }
}

export const dbConnectionManager = new DatabaseConnectionManager();
