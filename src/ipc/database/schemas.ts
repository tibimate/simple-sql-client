import { z } from "zod";

export const ConnectDatabaseInput = z.object({
  connectionId: z.string().uuid(),
});

export const DisconnectDatabaseInput = z.object({
  connectionId: z.string().uuid(),
});

export const ListTablesInput = z.object({
  connectionId: z.string().uuid(),
});

export const ExecuteQueryInput = z.object({
  connectionId: z.string().uuid(),
  query: z.string().min(1),
});

export const GetTableSchemaInput = z.object({
  connectionId: z.string().uuid(),
  tableName: z.string().min(1),
});

export const QueryResultSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.unknown()),
});

export const TableSchemaColumnSchema = z.object({
  name: z.string(),
  type: z.string(),
  nullable: z.boolean(),
  autoIncrement: z.boolean(),
  primaryKey: z.boolean(),
  foreignKey: z
    .object({
      table: z.string(),
      column: z.string(),
    })
    .nullable()
    .optional(),
});

export const GetForeignKeyRowsInput = z.object({
  connectionId: z.string().uuid(),
  tableName: z.string().min(1),
  columnName: z.string().min(1),
  value: z.string(),
  limit: z.number().int().positive().max(50).default(5),
});

export const InsertRowInput = z.object({
  connectionId: z.string().uuid(),
  tableName: z.string().min(1),
  values: z.record(z.string(), z.string()),
});

export const DeleteRowsInput = z.object({
  connectionId: z.string().uuid(),
  tableName: z.string().min(1),
  rows: z.array(z.record(z.string(), z.unknown())),
});

export const UpdateRowInput = z.object({
  connectionId: z.string().uuid(),
  tableName: z.string().min(1),
  values: z.record(z.string(), z.string()),
  originalRow: z.record(z.string(), z.unknown()),
});

export type ConnectDatabaseInput = z.infer<typeof ConnectDatabaseInput>;
export type ExecuteQueryInput = z.infer<typeof ExecuteQueryInput>;
export type QueryResult = z.infer<typeof QueryResultSchema>;
export type TableSchemaColumn = z.infer<typeof TableSchemaColumnSchema>;
export type GetForeignKeyRowsInput = z.infer<typeof GetForeignKeyRowsInput>;
export type InsertRowInput = z.infer<typeof InsertRowInput>;
export type DeleteRowsInput = z.infer<typeof DeleteRowsInput>;
export type UpdateRowInput = z.infer<typeof UpdateRowInput>;
