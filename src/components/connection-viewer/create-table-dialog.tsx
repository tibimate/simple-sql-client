import { PlusIcon, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

type DbType = "postgres" | "mysql" | "sqlite";

const TABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface ColumnDraft {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  autoIncrement: boolean;
}

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { query: string; tableName: string }) => Promise<void>;
  isCreating: boolean;
  dbType: DbType;
  error?: string | null;
}

const createColumnId = (): string => crypto.randomUUID();

const getDefaultColumn = (dbType: DbType): ColumnDraft => {
  if (dbType === "postgres") {
    return {
      id: createColumnId(),
      name: "id",
      type: "serial",
      nullable: false,
      primaryKey: true,
      autoIncrement: true,
    };
  }
  if (dbType === "mysql") {
    return {
      id: createColumnId(),
      name: "id",
      type: "int",
      nullable: false,
      primaryKey: true,
      autoIncrement: true,
    };
  }
  return {
    id: createColumnId(),
    name: "id",
    type: "integer",
    nullable: false,
    primaryKey: true,
    autoIncrement: true,
  };
};

const getTypeOptions = (dbType: DbType): string[] => {
  if (dbType === "postgres") {
    return [
      "serial",
      "bigserial",
      "integer",
      "bigint",
      "varchar(255)",
      "text",
      "boolean",
      "date",
      "timestamp",
    ];
  }
  if (dbType === "mysql") {
    return [
      "int",
      "bigint",
      "varchar(255)",
      "text",
      "boolean",
      "date",
      "datetime",
    ];
  }
  return ["integer", "text", "real", "blob", "numeric", "date", "datetime"];
};

const quoteIdentifier = (dbType: DbType, value: string): string => {
  if (dbType === "mysql") {
    return `\`${value}\``;
  }
  return `"${value}"`;
};

const validateTableName = (tableName: string) => {
  if (!tableName) {
    throw new Error("Table name is required");
  }
  if (!TABLE_NAME_PATTERN.test(tableName)) {
    throw new Error(
      "Table names must start with a letter or underscore and use only letters, numbers, and underscores."
    );
  }
};

const validateColumns = (columns: ColumnDraft[]) => {
  if (columns.length === 0) {
    throw new Error("At least one column is required");
  }

  const seenNames = new Set<string>();
  for (const column of columns) {
    const columnName = column.name.trim();
    if (!columnName) {
      throw new Error("All columns must have a name");
    }
    const normalized = columnName.toLowerCase();
    if (seenNames.has(normalized)) {
      throw new Error("Column names must be unique");
    }
    seenNames.add(normalized);
  }
};

const getPrimaryKeyColumns = (columns: ColumnDraft[]) =>
  columns
    .filter((column) => column.primaryKey || column.autoIncrement)
    .map((column) => column.name.trim());

const buildColumnDefinition = (
  column: ColumnDraft,
  dbType: DbType,
  hasCompositePrimaryKey: boolean
) => {
  const columnName = column.name.trim();
  const quotedName = quoteIdentifier(dbType, columnName);
  let type = column.type.trim();

  if (dbType === "postgres" && column.autoIncrement) {
    type = type.toLowerCase().includes("bigint") ? "bigserial" : "serial";
  }

  if (dbType === "sqlite" && column.autoIncrement) {
    return `${quotedName} INTEGER PRIMARY KEY AUTOINCREMENT`;
  }

  let columnSql = `${quotedName} ${type}`;

  if (!hasCompositePrimaryKey && (column.primaryKey || column.autoIncrement)) {
    columnSql += " PRIMARY KEY";
  }

  if (dbType === "mysql" && column.autoIncrement) {
    columnSql += " AUTO_INCREMENT";
  }

  if (!(column.nullable || column.primaryKey || column.autoIncrement)) {
    columnSql += " NOT NULL";
  }

  return columnSql;
};

const buildCreateTableStatement = (
  dbType: DbType,
  tableName: string,
  columns: ColumnDraft[]
) => {
  validateTableName(tableName);
  validateColumns(columns);

  const primaryKeyColumns = getPrimaryKeyColumns(columns);
  const hasCompositePrimaryKey = primaryKeyColumns.length > 1;

  const columnDefinitions = columns.map((column) =>
    buildColumnDefinition(column, dbType, hasCompositePrimaryKey)
  );

  if (hasCompositePrimaryKey) {
    columnDefinitions.push(
      `PRIMARY KEY (${primaryKeyColumns
        .map((name) => quoteIdentifier(dbType, name))
        .join(", ")})`
    );
  }

  const query = `CREATE TABLE ${quoteIdentifier(dbType, tableName)} (\n  ${columnDefinitions.join(",\n  ")}\n);`;

  return { query, tableName };
};

export function CreateTableDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
  dbType,
  error,
}: CreateTableDialogProps) {
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<ColumnDraft[]>(() => [
    getDefaultColumn(dbType),
  ]);
  const [localError, setLocalError] = useState<string | null>(null);

  const typeOptions = useMemo(() => getTypeOptions(dbType), [dbType]);
  const trimmedTableName = tableName.trim();
  const tableNameError = useMemo(() => {
    if (!trimmedTableName) {
      return null;
    }
    if (!TABLE_NAME_PATTERN.test(trimmedTableName)) {
      return "Table names must start with a letter or underscore and use only letters, numbers, and underscores.";
    }
    return null;
  }, [trimmedTableName]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTableName("");
    setColumns([getDefaultColumn(dbType)]);
    setLocalError(null);
  }, [dbType, open]);

  const updateColumn = (columnId: string, updates: Partial<ColumnDraft>) => {
    setColumns((current) =>
      current.map((column) =>
        column.id === columnId ? { ...column, ...updates } : column
      )
    );
  };

  const handleToggleAutoIncrement = (columnId: string, value: boolean) => {
    setColumns((current) => {
      const updated = current.map((column) => {
        if (column.id !== columnId) {
          return dbType === "sqlite" && value
            ? { ...column, primaryKey: false, autoIncrement: false }
            : column;
        }

        return {
          ...column,
          autoIncrement: value,
          primaryKey: value || column.primaryKey,
          nullable: value ? false : column.nullable,
        };
      });

      return updated;
    });
  };

  const handleTogglePrimaryKey = (columnId: string, value: boolean) => {
    setColumns((current) =>
      current.map((column) => {
        if (column.id !== columnId) {
          return column;
        }
        if (dbType === "sqlite" && column.autoIncrement && !value) {
          return column;
        }
        return {
          ...column,
          primaryKey: value,
          nullable: value ? false : column.nullable,
        };
      })
    );
  };

  const addColumn = () => {
    setColumns((current) => [
      ...current,
      {
        id: createColumnId(),
        name: "",
        type: typeOptions[0] ?? "text",
        nullable: true,
        primaryKey: false,
        autoIncrement: false,
      },
    ]);
  };

  const removeColumn = (columnId: string) => {
    setColumns((current) => current.filter((column) => column.id !== columnId));
  };

  const buildCreateTableQuery = (): {
    query: string;
    tableName: string;
  } => {
    return buildCreateTableStatement(dbType, trimmedTableName, columns);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    try {
      const payload = buildCreateTableQuery();
      await onCreate(payload);
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Failed to build create table statement";
      setLocalError(message);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="text-zinc-700 sm:max-w-4xl dark:text-zinc-300">
        <DialogHeader>
          <DialogTitle>Create Table</DialogTitle>
          <DialogDescription>
            Define the table name and columns, then create it in the database.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 max-h-[70vh] overflow-y-auto px-4">
          <form className="space-y-4 py-4" onSubmit={handleSubmit}>
            {(error || localError || tableNameError) && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
                {localError ?? tableNameError ?? error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="table-name">Table name</Label>
              <Input
                id="table-name"
                onChange={(event) => setTableName(event.target.value)}
                placeholder="e.g. customers"
                required
                value={tableName}
              />
              <p className="text-muted-foreground text-xs">
                Use letters, numbers, and underscores only. No spaces.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Columns</Label>
                <Button
                  onClick={addColumn}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <PlusIcon className="mr-2 h-3 w-3" />
                  Add column
                </Button>
              </div>

              <div className="space-y-3">
                {columns.map((column, index) => (
                  <div
                    className="grid grid-cols-1 gap-3 rounded border border-zinc-200 bg-zinc-50 p-3 sm:grid-cols-12 dark:border-zinc-700 dark:bg-zinc-900"
                    key={column.id}
                  >
                    <div className="sm:col-span-3">
                      <Label htmlFor={`column-name-${column.id}`}>Name</Label>
                      <Input
                        id={`column-name-${column.id}`}
                        onChange={(event) =>
                          updateColumn(column.id, { name: event.target.value })
                        }
                        placeholder={`column_${index + 1}`}
                        required
                        value={column.name}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label htmlFor={`column-type-${column.id}`}>Type</Label>
                      <Select
                        onValueChange={(value) =>
                          updateColumn(column.id, { type: value })
                        }
                        value={column.type}
                      >
                        <SelectTrigger className="w-full max-w-48">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {typeOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        checked={column.nullable}
                        className="h-4 w-4"
                        id={`column-nullable-${column.id}`}
                        onChange={(event) =>
                          updateColumn(column.id, {
                            nullable: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />
                      <Label htmlFor={`column-nullable-${column.id}`}>
                        Nullable
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        checked={column.primaryKey}
                        className="h-4 w-4"
                        disabled={dbType === "sqlite" && column.autoIncrement}
                        id={`column-primary-${column.id}`}
                        onChange={(event) =>
                          handleTogglePrimaryKey(
                            column.id,
                            event.target.checked
                          )
                        }
                        type="checkbox"
                      />
                      <Label htmlFor={`column-primary-${column.id}`}>
                        Primary
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        checked={column.autoIncrement}
                        className="h-4 w-4"
                        disabled={
                          dbType === "sqlite" &&
                          !column.primaryKey &&
                          columns.some((item) => item.autoIncrement)
                        }
                        id={`column-auto-${column.id}`}
                        onChange={(event) =>
                          handleToggleAutoIncrement(
                            column.id,
                            event.target.checked
                          )
                        }
                        type="checkbox"
                      />
                      <Label htmlFor={`column-auto-${column.id}`}>
                        Auto inc
                      </Label>
                    </div>
                    <div className="flex items-center justify-end sm:col-span-12">
                      <Button
                        disabled={columns.length === 1}
                        onClick={() => removeColumn(column.id)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove column</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                disabled={isCreating}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={isCreating || !trimmedTableName || !!tableNameError}
                type="submit"
              >
                {isCreating ? "Creating..." : "Create table"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
