import type { Pool } from "pg";
import type { PostgresConnection } from "@/ipc/connections/schemas";

export const connectPostgres = async (
  config: PostgresConnection
): Promise<Pool> => {
  const { Pool } = await import("pg");
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
  });

  const testClient = await pool.connect();
  testClient.release();

  return pool;
};

export const disconnectPostgres = async (pool: Pool): Promise<void> => {
  await pool.end();
};

export const listPostgresTables = async (pool: Pool): Promise<string[]> => {
  const result = await pool.query(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );
  return result.rows.map((row) => row.tablename);
};

export const executePostgresQuery = async (
  pool: Pool,
  query: string
): Promise<{ columns: string[]; rows: unknown[] }> => {
  const result = await pool.query(query);
  const columns = result.fields.map((field) => field.name);
  return { columns, rows: result.rows };
};

export const getPostgresTableSchema = async (
  pool: Pool,
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
  const foreignKeyResult = await pool.query(
    `SELECT kcu.column_name,
            ccu.table_name AS referenced_table,
            ccu.column_name AS referenced_column
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
     WHERE tc.constraint_type = 'FOREIGN KEY'
       AND tc.table_schema = 'public'
       AND tc.table_name = $1`,
    [tableName]
  );
  const foreignKeys = new Map<string, { table: string; column: string }>();
  for (const row of foreignKeyResult.rows) {
    foreignKeys.set(row.column_name, {
      table: row.referenced_table,
      column: row.referenced_column,
    });
  }

  const result = await pool.query(
    `SELECT c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            (tc.constraint_type = 'PRIMARY KEY') AS is_primary
     FROM information_schema.columns c
     LEFT JOIN information_schema.key_column_usage kcu
       ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
     LEFT JOIN information_schema.table_constraints tc
       ON kcu.constraint_name = tc.constraint_name AND tc.constraint_type = 'PRIMARY KEY'
     WHERE c.table_name = $1
     ORDER BY c.ordinal_position`,
    [tableName]
  );

  return result.rows.map((row) => ({
    name: row.column_name,
    type: row.data_type,
    nullable: row.is_nullable === "YES",
    autoIncrement:
      typeof row.column_default === "string" &&
      row.column_default.startsWith("nextval("),
    primaryKey: row.is_primary === true,
    foreignKey: foreignKeys.get(row.column_name) ?? null,
  }));
};
