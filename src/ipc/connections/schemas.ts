import { z } from "zod";

export const ConnectionType = z.enum(["postgres", "mysql", "sqlite"]);

export const BaseConnectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: ConnectionType,
  createdAt: z.string(),
});

export const PostgresConnectionSchema = BaseConnectionSchema.extend({
  type: z.literal("postgres"),
  host: z.string().min(1),
  port: z.number().int().positive().default(5432),
  username: z.string().min(1),
  password: z.string(),
  database: z.string().min(1),
  ssl: z.boolean().default(false),
});

export const MySQLConnectionSchema = BaseConnectionSchema.extend({
  type: z.literal("mysql"),
  host: z.string().min(1),
  port: z.number().int().positive().default(3306),
  username: z.string().min(1),
  password: z.string(),
  database: z.string().min(1),
  ssl: z.boolean().default(false),
});

export const SQLiteConnectionSchema = BaseConnectionSchema.extend({
  type: z.literal("sqlite"),
  filePath: z.string().min(1),
});

export const ConnectionSchema = z.discriminatedUnion("type", [
  PostgresConnectionSchema,
  MySQLConnectionSchema,
  SQLiteConnectionSchema,
]);

export const CreatePostgresConnectionInput = PostgresConnectionSchema.omit({
  id: true,
  createdAt: true,
});

export const CreateMySQLConnectionInput = MySQLConnectionSchema.omit({
  id: true,
  createdAt: true,
});

export const CreateSQLiteConnectionInput = SQLiteConnectionSchema.omit({
  id: true,
  createdAt: true,
});

export const CreateConnectionInput = z.discriminatedUnion("type", [
  CreatePostgresConnectionInput,
  CreateMySQLConnectionInput,
  CreateSQLiteConnectionInput,
]);

export const SelectFileInput = z.object({
  filters: z
    .array(
      z.object({
        name: z.string(),
        extensions: z.array(z.string()),
      })
    )
    .optional(),
});

export type ConnectionType = z.infer<typeof ConnectionType>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type PostgresConnection = z.infer<typeof PostgresConnectionSchema>;
export type MySQLConnection = z.infer<typeof MySQLConnectionSchema>;
export type SQLiteConnection = z.infer<typeof SQLiteConnectionSchema>;
export type CreateConnectionInput = z.infer<typeof CreateConnectionInput>;
export type SelectFileInput = z.infer<typeof SelectFileInput>;
