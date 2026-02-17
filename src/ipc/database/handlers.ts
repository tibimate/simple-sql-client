import { ORPCError } from "@orpc/client";
import { os } from "@orpc/server";
import { z } from "zod";
import { dbConnectionManager } from "@/database/connection-manager";
import { connectionStorage } from "../connections/storage";
import { mainLogger } from "@/utils/main-logger";
import {
  ConnectDatabaseInput,
  DeleteRowsInput,
  DisconnectDatabaseInput,
  ExecuteQueryInput,
  GetForeignKeyRowsInput,
  GetTableSchemaInput,
  InsertRowInput,
  ListTablesInput,
  UpdateRowInput,
} from "./schemas";

const toORPCError = (
  error: unknown,
  fallbackMessage: string
): ORPCError<"INTERNAL_SERVER_ERROR", { detail: string }> => {
  if (error instanceof ORPCError) {
    return error;
  }

  const detail = error instanceof Error ? error.message : fallbackMessage;
  return new ORPCError("INTERNAL_SERVER_ERROR", {
    message: detail,
    data: { detail },
  });
};

const isDateType = (type: string): boolean => {
  const lower = type.toLowerCase();
  return (
    lower.includes("date") &&
    !lower.includes("time") &&
    !lower.includes("timestamp")
  );
};

const isDateTimeType = (type: string): boolean => {
  const lower = type.toLowerCase();
  return (
    lower.includes("timestamp") ||
    lower.includes("datetime") ||
    lower.includes("time")
  );
};

const isTimeOnlyType = (type: string): boolean => {
  const lower = type.toLowerCase();
  return (
    lower.includes("time") &&
    !lower.includes("date") &&
    !lower.includes("timestamp") &&
    !lower.includes("datetime")
  );
};

const padNumber = (value: number): string => String(value).padStart(2, "0");

const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
};

const formatLocalTime = (date: Date): string => {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`;
};

const formatLocalDateTime = (date: Date): string => {
  return `${formatLocalDate(date)} ${formatLocalTime(date)}`;
};

const normalizeTimeString = (raw: string): string => {
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }
  if (/^\d{2}:\d{2}$/.test(raw)) {
    return `${raw}:00`;
  }
  return raw;
};

const normalizeDateTimeString = (raw: string): string => {
  const normalized = raw.replace("T", " ");
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    return normalized;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    return `${normalized}:00`;
  }
  return normalized;
};

const formatDateValue = (value: unknown, type: string): string => {
  if (value instanceof Date) {
    if (isDateType(type)) {
      return formatLocalDate(value);
    }
    if (isTimeOnlyType(type)) {
      return formatLocalTime(value);
    }
    if (isDateTimeType(type)) {
      return formatLocalDateTime(value);
    }
    return value.toISOString();
  }

  const raw = String(value);
  if (isTimeOnlyType(type)) {
    return normalizeTimeString(raw);
  }

  if (isDateType(type)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }
    return formatLocalDate(parsed);
  }

  if (isDateTimeType(type)) {
    const normalized = normalizeDateTimeString(raw);
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return normalized;
    }
    return formatLocalDateTime(parsed);
  }

  return raw;
};

const escapeSqlValue = (value: string): string => value.replace(/'/g, "''");

const isNumericType = (type: string): boolean => {
  const lower = type.toLowerCase();
  return (
    lower.includes("int") ||
    lower.includes("numeric") ||
    lower.includes("decimal") ||
    lower.includes("float") ||
    lower.includes("real") ||
    lower.includes("double")
  );
};

const isBooleanType = (type: string): boolean => {
  const lower = type.toLowerCase();
  return (
    lower.includes("bool") ||
    lower === "boolean" ||
    lower.includes("tinyint(1)") ||
    lower.includes("bit")
  );
};

export const connectDatabase = os
  .input(ConnectDatabaseInput)
  .handler(async ({ input }) => {
    try {
      mainLogger.info("Attempting to connect to database:", input.connectionId);
      
      const connection = connectionStorage.getConnectionById(
        input.connectionId
      );
      if (!connection) {
        mainLogger.error("Connection not found:", input.connectionId);
        throw new Error("Connection not found");
      }

      mainLogger.info("Found connection:", {
        id: connection.id,
        type: connection.type,
        name: connection.name,
      });

      await dbConnectionManager.connect(connection);
      mainLogger.info("Successfully connected to database:", input.connectionId);
      return { success: true };
    } catch (error) {
      mainLogger.error("Failed to connect to database:", error);
      throw toORPCError(error, "Failed to connect to database");
    }
  });

export const disconnectDatabase = os
  .input(DisconnectDatabaseInput)
  .handler(async ({ input }) => {
    try {
      await dbConnectionManager.disconnect(input.connectionId);
      return { success: true };
    } catch (error) {
      throw toORPCError(error, "Failed to disconnect from database");
    }
  });

export const isConnected = os
  .input(ConnectDatabaseInput)
  .handler(({ input }) => {
    try {
      return dbConnectionManager.isConnected(input.connectionId);
    } catch (error) {
      throw toORPCError(error, "Failed to check connection state");
    }
  });

export const listTables = os
  .input(ListTablesInput)
  .handler(async ({ input }) => {
    try {
      const tables = await dbConnectionManager.listTables(input.connectionId);
      return tables;
    } catch (error) {
      throw toORPCError(error, "Failed to list tables");
    }
  });

export const executeQuery = os
  .input(ExecuteQueryInput)
  .handler(async ({ input }) => {
    try {
      const result = await dbConnectionManager.executeQuery(
        input.connectionId,
        input.query
      );
      return result;
    } catch (error) {
      throw toORPCError(error, "Failed to execute query");
    }
  });

export const getTableSchema = os
  .input(GetTableSchemaInput)
  .handler(async ({ input }) => {
    try {
      const schema = await dbConnectionManager.getTableSchema(
        input.connectionId,
        input.tableName
      );

      const isDateType = (type: string): boolean => {
        const lower = type.toLowerCase();
        return (
          lower.includes("date") &&
          !lower.includes("time") &&
          !lower.includes("timestamp")
        );
      };

      const isDateTimeType = (type: string): boolean => {
        const lower = type.toLowerCase();
        return (
          lower.includes("timestamp") ||
          lower.includes("datetime") ||
          lower.includes("time")
        );
      };

      const _formatDateValue = (value: unknown, type: string): string => {
        if (value instanceof Date) {
          const iso = value.toISOString();
          if (isDateType(type)) {
            return iso.slice(0, 10);
          }
          if (isDateTimeType(type)) {
            return iso.slice(0, 19).replace("T", " ");
          }
          return iso;
        }

        const raw = String(value);
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) {
          return raw;
        }

        const iso = parsed.toISOString();
        if (isDateType(type)) {
          return iso.slice(0, 10);
        }
        if (isDateTimeType(type)) {
          return iso.slice(0, 19).replace("T", " ");
        }
        return iso;
      };
      return schema;
    } catch (error) {
      throw toORPCError(error, "Failed to get table schema");
    }
  });

export const getTableData = os
  .input(
    z.object({
      connectionId: z.string().uuid(),
      tableName: z.string().min(1),
      limit: z.number().int().positive().default(100),
      offset: z.number().int().nonnegative().default(0),
      orderBy: z.string().optional(),
      order: z.enum(["asc", "desc"]).optional(),
      filters: z
        .array(
          z.object({
            column: z.string(),
            value: z.string(),
            operator: z.enum([
              "contains",
              "equals",
              "startsWith",
              "endsWith",
              "gt",
              "lt",
              "gte",
              "lte",
            ]),
          })
        )
        .optional(),
    })
  )
  .handler(async ({ input }) => {
    try {
      // Get connection to determine database type
      const activeConnection = dbConnectionManager.getConnection(
        input.connectionId
      );
      const dbType = activeConnection?.config.type || "postgres";

      // Helper function to quote identifiers based on database type
      const quoteIdentifier = (name: string): string => {
        if (dbType === "mysql") {
          return `\`${name}\``;
        }
        if (dbType === "sqlite") {
          return `"${name}"`;
        }
        return `"${name}"`; // postgres
      };

      let query = `SELECT * FROM ${quoteIdentifier(input.tableName)}`;
      const conditions: string[] = [];

      // Get table schema to check column types
      const schema = await dbConnectionManager.getTableSchema(
        input.connectionId,
        input.tableName
      );

      // Helper function to check if a column is a text-like type
      const isTextColumn = (columnName: string): boolean => {
        const column = schema.find((col) => col.name === columnName);
        if (!column) {
          return true; // Assume text for unknown columns
        }
        const type = column.type.toLowerCase();
        return (
          type.includes("char") ||
          type.includes("text") ||
          type.includes("varchar") ||
          type.includes("character")
        );
      };

      // Build WHERE clause from filters
      if (input.filters && input.filters.length > 0) {
        for (const filter of input.filters) {
          if (!filter.value) {
            continue;
          }

          const column = quoteIdentifier(filter.column);
          const value = filter.value.replace(/'/g, "''"); // Escape single quotes

          // Check if value is a date/datetime format (ISO format like 2026-02-02 or 2026-02-02T16:31)
          const isDateTimeFormat = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(
            value
          );

          // Try to parse as number for numeric comparisons (but not if it's a datetime)
          const numValue = Number.parseFloat(value);
          const isNumeric =
            !Number.isNaN(numValue) && value.trim() !== "" && !isDateTimeFormat;

          // Use LIKE for SQLite, ILIKE for PostgreSQL, LIKE for MySQL (case insensitive by default)
          const likeOperator = dbType === "postgres" ? "ILIKE" : "LIKE";

          // Check if the column is a text column
          const isText = isTextColumn(filter.column);
          console.log(
            `filter operator: ${filter.operator}, column: ${filter.column}, value: ${value}, isText: ${isText}, isNumeric: ${isNumeric}`
          );
          // For non-text columns with text-based operators, cast to text
          const castColumn =
            !isText &&
            ["contains", "startsWith", "endsWith"].includes(filter.operator)
              ? dbType === "postgres"
                ? `CAST(${column} AS TEXT)`
                : dbType === "mysql"
                  ? `CAST(${column} AS CHAR)`
                  : `CAST(${column} AS TEXT)`
              : column;

          switch (filter.operator) {
            case "contains":
              conditions.push(`${castColumn} ${likeOperator} '%${value}%'`);
              break;
            case "equals":
              // Use numeric comparison if it's a number, otherwise string comparison
              if (isNumeric && !isText) {
                conditions.push(`${column} = ${numValue}`);
              } else {
                conditions.push(`${column} = '${value}'`);
              }
              break;
            case "startsWith":
              conditions.push(`${castColumn} ${likeOperator} '${value}%'`);
              break;
            case "endsWith":
              conditions.push(`${castColumn} ${likeOperator} '%${value}'`);
              break;
            case "gt":
              conditions.push(
                `${column} > ${isNumeric ? numValue : `'${value}'`}`
              );
              break;
            case "lt":
              conditions.push(
                `${column} < ${isNumeric ? numValue : `'${value}'`}`
              );
              break;
            case "gte":
              conditions.push(
                `${column} >= ${isNumeric ? numValue : `'${value}'`}`
              );
              break;
            case "lte":
              conditions.push(
                `${column} <= ${isNumeric ? numValue : `'${value}'`}`
              );
              break;
          }
        }
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }

      // Always add ORDER BY for stable pagination
      if (input.orderBy) {
        const orderDirection = input.order === "desc" ? "DESC" : "ASC";
        query += ` ORDER BY ${quoteIdentifier(input.orderBy)} ${orderDirection}`;
      } else {
        // Check if 'id' column exists before using it as default
        const hasIdColumn = schema.some((col) => col.name === "id");
        if (hasIdColumn) {
          query += ` ORDER BY ${quoteIdentifier("id")} ASC`;
        } else if (schema.length > 0) {
          // Use the first column if 'id' doesn't exist
          query += ` ORDER BY ${quoteIdentifier(schema[0].name)} ASC`;
        }
        // If no columns, don't add ORDER BY clause
      }

      query += ` LIMIT ${input.limit} OFFSET ${input.offset}`;

      console.log("=== getTableData ===");
      console.log("Input:", JSON.stringify(input));
      console.log("Final Query:", JSON.stringify(query));

      const result = await dbConnectionManager.executeQuery(
        input.connectionId,
        query
      );

      console.log("Result rows count:", result.rows.length);

      return result;
    } catch (error) {
      console.error("getTableData error:", error);
      throw toORPCError(error, "Failed to load table data");
    }
  });

export const getForeignKeyRows = os
  .input(GetForeignKeyRowsInput)
  .handler(async ({ input }) => {
    try {
      if (!input.value || input.value.trim() === "") {
        return { rows: [], hasMore: false };
      }

      const activeConnection = dbConnectionManager.getConnection(
        input.connectionId
      );
      const dbType = activeConnection?.config.type || "postgres";

      const quoteIdentifier = (name: string): string => {
        if (dbType === "mysql") {
          return `\`${name}\``;
        }
        if (dbType === "sqlite") {
          return `"${name}"`;
        }
        return `"${name}"`;
      };

      const schema = await dbConnectionManager.getTableSchema(
        input.connectionId,
        input.tableName
      );
      const column = schema.find((col) => col.name === input.columnName);
      const columnType = column?.type ?? "";

      const rawValue = input.value.trim();
      let comparisonValue = `'${escapeSqlValue(rawValue)}'`;

      if (isBooleanType(columnType)) {
        if (rawValue === "true" || rawValue === "false") {
          comparisonValue = rawValue === "true" ? "TRUE" : "FALSE";
        }
      } else if (isNumericType(columnType)) {
        const numericValue = Number.parseFloat(rawValue);
        if (!Number.isNaN(numericValue)) {
          comparisonValue = String(numericValue);
        }
      }

      const limitPlusOne = input.limit + 1;
      const query = `SELECT * FROM ${quoteIdentifier(input.tableName)} WHERE ${quoteIdentifier(input.columnName)} = ${comparisonValue} LIMIT ${limitPlusOne}`;

      const result = await dbConnectionManager.executeQuery(
        input.connectionId,
        query
      );
      const rows = Array.isArray(result.rows)
        ? (result.rows as Array<Record<string, unknown>>)
        : [];
      const hasMore = rows.length > input.limit;

      return {
        rows: hasMore ? rows.slice(0, input.limit) : rows,
        hasMore,
      };
    } catch (error) {
      console.error("getForeignKeyRows error:", error);
      throw toORPCError(error, "Failed to load foreign key row");
    }
  });

export const insertRow = os.input(InsertRowInput).handler(async ({ input }) => {
  try {
    // Get connection to determine database type
    const activeConnection = dbConnectionManager.getConnection(
      input.connectionId
    );
    const dbType = activeConnection?.config.type || "postgres";

    // Helper function to quote identifiers based on database type
    const quoteIdentifier = (name: string): string => {
      if (dbType === "mysql") {
        return `\`${name}\``;
      }
      if (dbType === "sqlite") {
        return `"${name}"`;
      }
      return `"${name}"`; // postgres
    };

    // Get table schema to handle types properly
    const schema = await dbConnectionManager.getTableSchema(
      input.connectionId,
      input.tableName
    );

    // Build INSERT query
    const columns = Object.keys(input.values);
    const columnNames = columns.map((c) => quoteIdentifier(c)).join(", ");
    console.log("Insert values:", input.values);
    console.log("Table schema:", schema);
    // Build values with proper type handling
    const values = columns
      .map((col) => {
        const value = input.values[col];
        const column = schema.find((c) => c.name === col);

        // Handle NULL values
        if (value === "" && column?.nullable) {
          return "NULL";
        }

        // Handle boolean values
        if (value === "true" || value === "false") {
          return value === "true" ? "TRUE" : "FALSE";
        }

        // Handle numeric types
        const type = column?.type.toLowerCase() || "";
        if (
          type.includes("int") ||
          type.includes("numeric") ||
          type.includes("decimal") ||
          type.includes("float") ||
          type.includes("real") ||
          type.includes("double")
        ) {
          return value || "NULL";
        }

        // Handle string values (escape single quotes)
        return `'${String(value).replace(/'/g, "''")}'`;
      })
      .join(", ");

    const query = `INSERT INTO ${quoteIdentifier(input.tableName)} (${columnNames}) VALUES (${values})`;

    console.log("=== insertRow ===");
    console.log("Query:", query);

    await dbConnectionManager.executeQuery(input.connectionId, query);

    return { success: true };
  } catch (error) {
    console.error("insertRow error:", error);
    throw toORPCError(error, "Failed to insert row");
  }
});

export const deleteRows = os
  .input(DeleteRowsInput)
  .handler(async ({ input }) => {
    try {
      // Get connection to determine database type
      const activeConnection = dbConnectionManager.getConnection(
        input.connectionId
      );
      const dbType = activeConnection?.config.type || "postgres";

      // Helper function to quote identifiers based on database type
      const quoteIdentifier = (name: string): string => {
        if (dbType === "mysql") {
          return `\`${name}\``;
        }
        if (dbType === "sqlite") {
          return `"${name}"`;
        }
        return `"${name}"`; // postgres
      };

      // Get table schema
      const schema = await dbConnectionManager.getTableSchema(
        input.connectionId,
        input.tableName
      );

      // Build DELETE queries for each row
      // We'll use all columns to identify the row uniquely
      for (const row of input.rows) {
        const conditions: string[] = [];

        for (const [col, value] of Object.entries(row)) {
          const column = quoteIdentifier(col);
          const columnSchema = schema.find((c) => c.name === col);
          const type = columnSchema?.type.toLowerCase() || "";

          if (value === null || value === undefined) {
            conditions.push(`${column} IS NULL`);
          } else if (
            typeof value === "number" ||
            type.includes("int") ||
            type.includes("numeric") ||
            type.includes("decimal") ||
            type.includes("float") ||
            type.includes("real") ||
            type.includes("double")
          ) {
            conditions.push(`${column} = ${value}`);
          } else if (typeof value === "boolean") {
            conditions.push(`${column} = ${value ? "TRUE" : "FALSE"}`);
          } else {
            const strValue = String(value).replace(/'/g, "''");
            conditions.push(`${column} = '${strValue}'`);
          }
        }

        const query = `DELETE FROM ${quoteIdentifier(input.tableName)} WHERE ${conditions.join(" AND ")}`;

        console.log("=== deleteRows ===");
        console.log("Query:", query);

        await dbConnectionManager.executeQuery(input.connectionId, query);
      }

      return { success: true, deletedCount: input.rows.length };
    } catch (error) {
      console.error("deleteRows error:", error);
      throw toORPCError(error, "Failed to delete rows");
    }
  });

export const updateRow = os.input(UpdateRowInput).handler(async ({ input }) => {
  try {
    const activeConnection = dbConnectionManager.getConnection(
      input.connectionId
    );
    const dbType = activeConnection?.config.type || "postgres";

    const quoteIdentifier = (name: string): string => {
      if (dbType === "mysql") {
        return `\`${name}\``;
      }
      if (dbType === "sqlite") {
        return `"${name}"`;
      }
      return `"${name}"`;
    };

    const schema = await dbConnectionManager.getTableSchema(
      input.connectionId,
      input.tableName
    );

    const setParts: string[] = [];
    for (const [col, value] of Object.entries(input.values)) {
      const columnSchema = schema.find((c) => c.name === col);
      if (columnSchema?.autoIncrement) {
        continue;
      }

      if (value === "" && columnSchema?.nullable) {
        setParts.push(`${quoteIdentifier(col)} = NULL`);
        continue;
      }

      if (value === "true" || value === "false") {
        setParts.push(
          `${quoteIdentifier(col)} = ${value === "true" ? "TRUE" : "FALSE"}`
        );
        continue;
      }

      const type = columnSchema?.type.toLowerCase() || "";
      if (
        type.includes("int") ||
        type.includes("numeric") ||
        type.includes("decimal") ||
        type.includes("float") ||
        type.includes("real") ||
        type.includes("double")
      ) {
        setParts.push(`${quoteIdentifier(col)} = ${value || "NULL"}`);
        continue;
      }

      if (isDateType(type) || isDateTimeType(type)) {
        const formatted = formatDateValue(value, type).replace(/'/g, "''");
        setParts.push(`${quoteIdentifier(col)} = '${formatted}'`);
        continue;
      }

      setParts.push(`${quoteIdentifier(col)} = '${value.replace(/'/g, "''")}'`);
    }

    if (setParts.length === 0) {
      throw new Error("No columns to update");
    }

    const primaryKeys = schema
      .filter((col) => col.primaryKey)
      .map((col) => col.name);
    const whereColumns =
      primaryKeys.length > 0 ? primaryKeys : Object.keys(input.originalRow);

    const conditions: string[] = [];
    for (const col of whereColumns) {
      const value = (input.originalRow as Record<string, unknown>)[col];
      const columnSchema = schema.find((c) => c.name === col);
      const type = columnSchema?.type.toLowerCase() || "";
      const column = quoteIdentifier(col);

      if (value === null || value === undefined) {
        conditions.push(`${column} IS NULL`);
      } else if (
        typeof value === "number" ||
        type.includes("int") ||
        type.includes("numeric") ||
        type.includes("decimal") ||
        type.includes("float") ||
        type.includes("real") ||
        type.includes("double")
      ) {
        conditions.push(`${column} = ${value}`);
      } else if (typeof value === "boolean") {
        conditions.push(`${column} = ${value ? "TRUE" : "FALSE"}`);
      } else if (isDateType(type) || isDateTimeType(type)) {
        const formatted = formatDateValue(value, type).replace(/'/g, "''");
        conditions.push(`${column} = '${formatted}'`);
      } else {
        const strValue = String(value).replace(/'/g, "''");
        conditions.push(`${column} = '${strValue}'`);
      }
    }

    const query = `UPDATE ${quoteIdentifier(input.tableName)} SET ${setParts.join(", ")} WHERE ${conditions.join(" AND ")}`;

    console.log("=== updateRow ===");
    console.log("Query:", query);

    await dbConnectionManager.executeQuery(input.connectionId, query);

    return { success: true };
  } catch (error) {
    console.error("updateRow error:", error);
    throw toORPCError(error, "Failed to update row");
  }
});
