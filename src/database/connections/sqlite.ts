import type { Database as SQLiteDatabase } from "better-sqlite3";
import type { SQLiteConnection } from "@/ipc/connections/schemas";
import { mainLogger } from "@/utils/main-logger";

export const connectSQLite = async (
  config: SQLiteConnection
): Promise<SQLiteDatabase> => {
  try {
    mainLogger.info("Loading better-sqlite3 module...");
    const Database = (await import("better-sqlite3")).default;
    mainLogger.info("better-sqlite3 module loaded successfully");
    
    mainLogger.info("Opening SQLite database", {
      filePath: config.filePath,
    });
    
    const db = new Database(config.filePath, { readonly: false });
    mainLogger.info("SQLite database opened successfully");
    return db;
  } catch (error) {
    mainLogger.error("Failed to open SQLite database", error);
    throw error;
  }
};

export const disconnectSQLite = async (db: SQLiteDatabase): Promise<void> => {
  db.close();
};

export const listSQLiteTables = async (
  db: SQLiteDatabase
): Promise<string[]> => {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all() as Array<{ name: string }>;
  return tables.map((table) => table.name);
};

export const executeSQLiteQuery = async (
  db: SQLiteDatabase,
  query: string
): Promise<{ columns: string[]; rows: unknown[] }> => {
  const stmt = db.prepare(query);
  if (!stmt.reader) {
    stmt.run();
    return { columns: [], rows: [] };
  }
  const rows = stmt.all();
  const columns = stmt.columns().map((col) => col.name);
  return { columns, rows };
};

export const getSQLiteTableSchema = async (
  db: SQLiteDatabase,
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
> => {
  const foreignKeyRows = db
    .prepare(`PRAGMA foreign_key_list(${tableName})`)
    .all() as Array<{ from: string; table: string; to: string }>;
  const foreignKeys = new Map<string, { table: string; column: string }>();
  for (const row of foreignKeyRows) {
    foreignKeys.set(row.from, { table: row.table, column: row.to });
  }

  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
    type: string;
    notnull: number;
    pk: number;
  }>;
  return columns.map((col) => ({
    name: col.name,
    type: col.type,
    nullable: col.notnull === 0,
    autoIncrement: col.pk === 1 && col.type.toLowerCase().includes("int"),
    primaryKey: col.pk === 1,
    foreignKey: foreignKeys.get(col.name) ?? null,
  }));
};
