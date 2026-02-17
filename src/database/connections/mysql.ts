import type { Connection as MySQLConnection } from "mysql2/promise";
import type { MySQLConnection as MySQLConnectionConfig } from "@/ipc/connections/schemas";
import { mainLogger } from "@/utils/main-logger";

export const connectMySQL = async (
  config: MySQLConnectionConfig
): Promise<MySQLConnection> => {
  try {
    mainLogger.info("Loading mysql2/promise module...");
    const mysql = await import("mysql2/promise");
    mainLogger.info("mysql2/promise module loaded successfully");
    
    mainLogger.info("Creating MySQL connection", {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
    });
    
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl ? {} : undefined,
    });
    
    mainLogger.info("MySQL connection created successfully");
    return connection;
  } catch (error) {
    mainLogger.error("Failed to connect to MySQL", error);
    throw error;
  }
};

export const disconnectMySQL = async (
  connection: MySQLConnection
): Promise<void> => {
  await connection.end();
};

export const listMySQLTables = async (
  connection: MySQLConnection
): Promise<string[]> => {
  const [rows] = await connection.query("SHOW TABLES");
  const tables = rows as Record<string, string>[];
  return tables.map((row) => Object.values(row)[0]);
};

export const executeMySQLQuery = async (
  connection: MySQLConnection,
  query: string
): Promise<{ columns: string[]; rows: unknown[] }> => {
  const [rows, fields] = await connection.query(query);
  if (!(fields && Array.isArray(fields))) {
    return {
      columns: [],
      rows: Array.isArray(rows) ? (rows as unknown[]) : [],
    };
  }
  const columns = fields.map((field) => field.name);
  return { columns, rows: rows as unknown[] };
};

export const getMySQLTableSchema = async (
  connection: MySQLConnection,
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
  const [fkRows] = await connection.query(
    `SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [tableName]
  );
  const foreignKeys = new Map<string, { table: string; column: string }>();
  for (const row of fkRows as Array<{
    COLUMN_NAME: string;
    REFERENCED_TABLE_NAME: string;
    REFERENCED_COLUMN_NAME: string;
  }>) {
    foreignKeys.set(row.COLUMN_NAME, {
      table: row.REFERENCED_TABLE_NAME,
      column: row.REFERENCED_COLUMN_NAME,
    });
  }

  const [rows] = await connection.query(`DESCRIBE ${tableName}`);
  const columns = rows as Array<{
    Field: string;
    Type: string;
    Null: string;
    Extra?: string;
    Key?: string;
  }>;
  return columns.map((col) => ({
    name: col.Field,
    type: col.Type,
    nullable: col.Null === "YES",
    autoIncrement: col.Extra?.toLowerCase().includes("auto_increment") ?? false,
    primaryKey: col.Key === "PRI",
    foreignKey: foreignKeys.get(col.Field) ?? null,
  }));
};
