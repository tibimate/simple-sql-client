import { ArrowDown, ArrowUp, Loader, PencilIcon, Search } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";

const ENUM_REGEX = /enum\((.*)\)/i;

interface DataTableProps {
  columns: string[];
  rows: unknown[];
  isLoadingTable: boolean;
  isLoadingMore: boolean;
  sortColumn: string | null;
  sortOrder: "asc" | "desc";
  onColumnClick: (column: string) => void;
  rowCount: number;
  selectedRows: Set<number>;
  onRowSelect: (index: number) => void;
  onSelectAll: () => void;
  onEditRow: (row: Record<string, unknown>, index: number) => void;
  onEditCell: (
    row: Record<string, unknown>,
    column: string,
    value: string
  ) => Promise<void>;
  onForeignKeyLookup: (
    foreignKey: { table: string; column: string },
    value: unknown
  ) => Promise<{ rows: Record<string, unknown>[]; hasMore: boolean }>;
  onForeignKeyTableQuery: (params: {
    tableName: string;
    limit: number;
    offset: number;
    filters?: Array<{
      column: string;
      value: string;
      operator:
        | "contains"
        | "equals"
        | "startsWith"
        | "endsWith"
        | "gt"
        | "lt"
        | "gte"
        | "lte";
    }>;
    orderBy?: string;
    order?: "asc" | "desc";
  }) => Promise<{ columns: string[]; rows: unknown[] }>;
  getInputTypeForColumn: (
    columnName: string
  ) => "text" | "date" | "datetime-local";
  isEditableColumn: (columnName: string) => boolean;
  getColumnMeta: (columnName: string) => {
    type: string;
    nullable: boolean;
    foreignKey?: { table: string; column: string } | null;
  } | null;
}

export function DataTable({
  columns,
  rows,
  isLoadingTable,
  isLoadingMore,
  sortColumn,
  sortOrder,
  onColumnClick,
  rowCount,
  selectedRows,
  onRowSelect,
  onSelectAll,
  onEditRow,
  onEditCell,
  onForeignKeyLookup,
  onForeignKeyTableQuery,
  getInputTypeForColumn,
  isEditableColumn,
  getColumnMeta,
}: DataTableProps) {
  return (
    <>
      <table className="w-full border-collapse border border-gray-300 dark:border-zinc-700">
        <thead>
          <tr className="bg-gray-100 dark:bg-zinc-900">
            <th className="dark:text-zinc-200 w-4 border border-gray-300 px-4 py-2 text-left font-semibold text-xs dark:border-zinc-700">
              <Checkbox
                checked={rows.length > 0 && selectedRows.size === rows.length}
                disabled={rows.length === 0}
                onCheckedChange={(_checked) => onSelectAll()}
              />
            </th>
            <th className="dark:text-zinc-200 w-4 border border-gray-300 text-center font-semibold text-xs dark:border-zinc-700">
              <Button disabled size="icon" variant="ghost">
                <PencilIcon className="h-3 w-3" />
              </Button>
            </th>
            {columns.map((col) => (
              <th
                className="dark:text-zinc-200 border border-gray-300 px-4 py-2 text-left font-semibold text-xs dark:border-zinc-700"
                key={col}
              >
                <button
                  className="flex w-full cursor-pointer items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => onColumnClick(col)}
                  type="button"
                >
                  {col}
                  {sortColumn === col &&
                    (sortOrder === "asc" ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    ))}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(() => {
            if (isLoadingTable) {
              return (
                <tr>
                  <td className="p-4 text-center" colSpan={columns.length + 1}>
                    <Loader className="h-6 w-6 animate-spin text-gray-600 dark:text-zinc-300" />
                  </td>
                </tr>
              );
            }

            if (rows.length > 0) {
              return rows.map((row, idx) => (
                <Row
                  columns={columns}
                  getColumnMeta={getColumnMeta}
                  getInputTypeForColumn={getInputTypeForColumn}
                  idx={idx}
                  isEditableColumn={isEditableColumn}
                  key={idx}
                  onEditCell={onEditCell}
                  onEditRow={onEditRow}
                  onForeignKeyLookup={onForeignKeyLookup}
                  onForeignKeyTableQuery={onForeignKeyTableQuery}
                  onRowSelect={onRowSelect}
                  row={row}
                  selectedRows={selectedRows}
                />
              ));
            }

            return (
              <tr>
                <td
                  className="p-4 text-center text-gray-500 dark:text-zinc-400"
                  colSpan={columns.length + 2}
                >
                  No data found
                </td>
              </tr>
            );
          })()}
        </tbody>
      </table>
      <div className="mt-2 p-4 text-center text-gray-600 text-sm dark:border-zinc-700 dark:text-zinc-400">
        Showing {rowCount} rows
        {isLoadingMore && (
          <div className="ml-4 inline-block">
            <Loader className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
    </>
  );
}

function Row({
  idx,
  row,
  columns,
  selectedRows,
  onRowSelect,
  onEditRow,
  onEditCell,
  onForeignKeyLookup,
  onForeignKeyTableQuery,
  getInputTypeForColumn,
  isEditableColumn,
  getColumnMeta,
}: {
  idx: number;
  row: unknown;
  columns: string[];
  selectedRows: Set<number>;
  onRowSelect: (index: number) => void;
  onEditRow: (row: Record<string, unknown>, index: number) => void;
  onEditCell: (
    row: Record<string, unknown>,
    column: string,
    value: string
  ) => Promise<void>;
  onForeignKeyLookup: (
    foreignKey: { table: string; column: string },
    value: unknown
  ) => Promise<{ rows: Record<string, unknown>[]; hasMore: boolean }>;
  onForeignKeyTableQuery: (params: {
    tableName: string;
    limit: number;
    offset: number;
    filters?: Array<{
      column: string;
      value: string;
      operator:
        | "contains"
        | "equals"
        | "startsWith"
        | "endsWith"
        | "gt"
        | "lt"
        | "gte"
        | "lte";
    }>;
    orderBy?: string;
    order?: "asc" | "desc";
  }) => Promise<{ columns: string[]; rows: unknown[] }>;
  getInputTypeForColumn: (
    columnName: string
  ) => "text" | "date" | "datetime-local";
  isEditableColumn: (columnName: string) => boolean;
  getColumnMeta: (columnName: string) => {
    type: string;
    nullable: boolean;
    foreignKey?: { table: string; column: string } | null;
  } | null;
}) {
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  const [popoverMode, setPopoverMode] = useState<"edit" | "foreignKey">("edit");
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [nullSelected, setNullSelected] = useState(false);
  const [lastNonNullValue, setLastNonNullValue] = useState("");
  const [foreignKeyRows, setForeignKeyRows] = useState<
    Record<string, unknown>[]
  >([]);
  const [foreignKeyHasMore, setForeignKeyHasMore] = useState(false);
  const [isForeignKeyLoading, setIsForeignKeyLoading] = useState(false);
  const [foreignKeyError, setForeignKeyError] = useState<string | null>(null);
  const [isForeignKeyDialogOpen, setIsForeignKeyDialogOpen] = useState(false);
  const [foreignKeyDialogTable, setForeignKeyDialogTable] = useState<
    string | null
  >(null);
  const [foreignKeyDialogMeta, setForeignKeyDialogMeta] = useState<{
    table: string;
    column: string;
  } | null>(null);
  const [foreignKeyDialogColumn, setForeignKeyDialogColumn] = useState<
    string | null
  >(null);
  const [foreignKeyDialogColumns, setForeignKeyDialogColumns] = useState<
    string[]
  >([]);
  const [foreignKeyDialogRows, setForeignKeyDialogRows] = useState<
    Record<string, unknown>[]
  >([]);
  const [foreignKeyDialogSearchColumn, setForeignKeyDialogSearchColumn] =
    useState("");
  const [foreignKeyDialogSearchValue, setForeignKeyDialogSearchValue] =
    useState("");
  const [foreignKeyDialogError, setForeignKeyDialogError] = useState<
    string | null
  >(null);
  const [isForeignKeyDialogLoading, setIsForeignKeyDialogLoading] =
    useState(false);
  const clickTimeoutRef = useRef<number | null>(null);
  const rowRecord = row as Record<string, unknown>;

  const isBooleanType = (columnType: string): boolean => {
    const type = columnType.toLowerCase();
    return type.includes("bool") || type === "boolean";
  };

  const isEnumType = (columnType: string): boolean => {
    return columnType.toLowerCase().includes("enum(");
  };

  const getEnumValues = (columnType: string): string[] => {
    const match = columnType.match(ENUM_REGEX);
    if (!match) {
      return [];
    }
    return match[1]
      .split(",")
      .map((value) => value.trim().replace(/^['"]|['"]$/g, ""))
      .filter((value) => value.length > 0);
  };

  const isDateType = (columnType: string): boolean => {
    const type = columnType.toLowerCase();
    return (
      type.includes("date") &&
      !type.includes("time") &&
      !type.includes("timestamp")
    );
  };

  const isDateTimeType = (columnType: string): boolean => {
    const type = columnType.toLowerCase();
    return (
      type.includes("timestamp") ||
      type.includes("datetime") ||
      type.includes("time")
    );
  };

  const formatDateTimeLocal = (value: unknown): string => {
    const parsed = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return parsed.toISOString().slice(0, 16);
  };

  const formatDateOnly = (value: unknown): string => {
    const parsed = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return parsed.toISOString().slice(0, 10);
  };

  const startEdit = (column: string) => {
    if (!isEditableColumn(column)) {
      return;
    }
    setPopoverMode("edit");
    setForeignKeyRows([]);
    setForeignKeyHasMore(false);
    setForeignKeyError(null);
    setIsForeignKeyLoading(false);
    const meta = getColumnMeta(column);
    const type = meta?.type ?? "";
    const value = rowRecord[column];
    if (value === null || value === undefined) {
      setEditValue("");
      setNullSelected(true);
      setLastNonNullValue("");
    } else if (isDateTimeType(type)) {
      const formatted = formatDateTimeLocal(value);
      setEditValue(formatted);
      setNullSelected(false);
      setLastNonNullValue(formatted);
    } else if (isDateType(type)) {
      const formatted = formatDateOnly(value);
      setEditValue(formatted);
      setNullSelected(false);
      setLastNonNullValue(formatted);
    } else {
      const formatted = String(value);
      setEditValue(formatted);
      setNullSelected(false);
      setLastNonNullValue(formatted);
    }
    setOpenColumn(column);
  };

  const closePopover = () => {
    setOpenColumn(null);
    setPopoverMode("edit");
    setForeignKeyRows([]);
    setForeignKeyHasMore(false);
    setForeignKeyError(null);
    setIsForeignKeyLoading(false);
  };

  const saveEdit = async () => {
    if (!openColumn) {
      return;
    }
    try {
      setIsSaving(true);
      await onEditCell(rowRecord, openColumn, editValue);
      closePopover();
    } finally {
      setIsSaving(false);
    }
  };

  const openForeignKey = async (column: string) => {
    const meta = getColumnMeta(column);
    const foreignKey = meta?.foreignKey ?? null;
    if (!foreignKey) {
      return;
    }
    const rawValue = rowRecord[column];

    setPopoverMode("foreignKey");
    setOpenColumn(column);
    setForeignKeyRows([]);
    setForeignKeyHasMore(false);
    setForeignKeyError(null);
    setIsForeignKeyLoading(true);
    setEditValue(
      rawValue === null || rawValue === undefined ? "" : String(rawValue)
    );

    if (rawValue === null || rawValue === undefined || rawValue === "") {
      setIsForeignKeyLoading(false);
      return;
    }

    try {
      const result = await onForeignKeyLookup(foreignKey, rawValue);
      setForeignKeyRows(result.rows);
      setForeignKeyHasMore(result.hasMore);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setForeignKeyError(message);
    } finally {
      setIsForeignKeyLoading(false);
    }
  };

  const loadForeignKeyDialogData = async (
    tableName: string,
    columnName: string,
    value: string
  ) => {
    setIsForeignKeyDialogLoading(true);
    setForeignKeyDialogError(null);
    try {
      const filters = value.trim()
        ? [{ column: columnName, value, operator: "contains" as const }]
        : undefined;
      const result = await onForeignKeyTableQuery({
        tableName,
        limit: 50,
        offset: 0,
        filters,
      });
      const rows = Array.isArray(result.rows)
        ? (result.rows as Record<string, unknown>[])
        : [];
      setForeignKeyDialogColumns(result.columns);
      setForeignKeyDialogRows(rows);
      if (!columnName && result.columns.length > 0) {
        setForeignKeyDialogSearchColumn(result.columns[0]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setForeignKeyDialogError(message);
      setForeignKeyDialogRows([]);
    } finally {
      setIsForeignKeyDialogLoading(false);
    }
  };

  const openForeignKeyDialog = async (column: string) => {
    const meta = getColumnMeta(column);
    const foreignKey = meta?.foreignKey ?? null;
    if (!foreignKey) {
      return;
    }

    setForeignKeyDialogMeta(foreignKey);
    setForeignKeyDialogTable(foreignKey.table);
    setForeignKeyDialogColumn(column);
    setForeignKeyDialogSearchValue("");
    setForeignKeyDialogSearchColumn("");
    setIsForeignKeyDialogOpen(true);
    await loadForeignKeyDialogData(foreignKey.table, "", "");
  };

  const handleForeignKeySearch = async () => {
    if (!foreignKeyDialogTable) {
      return;
    }
    const columnName =
      foreignKeyDialogSearchColumn || foreignKeyDialogColumns[0] || "";
    if (!columnName) {
      return;
    }
    await loadForeignKeyDialogData(
      foreignKeyDialogTable,
      columnName,
      foreignKeyDialogSearchValue
    );
  };

  const handleForeignKeyRowSelect = async (
    rowItem: Record<string, unknown>
  ) => {
    const foreignKeyColumn = foreignKeyDialogMeta?.column;
    const targetColumn = foreignKeyDialogColumn;
    if (!(foreignKeyColumn && targetColumn)) {
      return;
    }
    const nextValue = rowItem[foreignKeyColumn];
    const nextValueString =
      nextValue === null || nextValue === undefined ? "" : String(nextValue);
    setEditValue(nextValueString);
    setForeignKeyRows([rowItem]);
    setForeignKeyHasMore(false);
    setForeignKeyError(null);

    try {
      setIsSaving(true);
      await onEditCell(rowRecord, targetColumn, nextValueString);
      toast.success("Foreign key updated");
      setIsForeignKeyDialogOpen(false);
      closePopover();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCellClick = (column: string) => {
    const meta = getColumnMeta(column);
    if (!meta?.foreignKey) {
      return;
    }
    if (clickTimeoutRef.current !== null) {
      window.clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = window.setTimeout(() => {
      clickTimeoutRef.current = null;
      openForeignKey(column).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(message);
      });
    }, 200);
  };

  const handleCellDoubleClick = (column: string) => {
    const meta = getColumnMeta(column);
    if (meta?.foreignKey) {
      return;
    }
    if (clickTimeoutRef.current !== null) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    startEdit(column);
  };

  return (
    <>
      <tr
        className={
          idx % 2 === 0
            ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-400"
            : "bg-gray-50 dark:bg-zinc-600 text-gray-900 dark:text-zinc-400"
        }
        key={idx}
      >
        <td className="w-4 border border-gray-300 px-4 py-2 dark:border-zinc-500">
          <Checkbox
            checked={selectedRows.has(idx)}
            onCheckedChange={(_checked) => onRowSelect(idx)}
          />
        </td>
        <td className="w-4 border border-gray-300 px-3 py-2 dark:border-zinc-500">
          <Button
            onClick={() => onEditRow(row as Record<string, unknown>, idx)}
            size="icon"
            variant="ghost"
          >
            <PencilIcon className="h-3 w-3" />
          </Button>
        </td>
        {columns.map((col) => (
          <td
            className="h-4 truncate border border-gray-300 px-4 py-2 text-xs dark:border-zinc-500"
            key={col}
          >
            <Popover
              onOpenChange={(open) => {
                if (!open) {
                  closePopover();
                }
              }}
              open={openColumn === col}
            >
              <PopoverTrigger asChild>
                <div
                  className={(() => {
                    const meta = getColumnMeta(col);
                    const isForeignKey = Boolean(meta?.foreignKey);
                    if (isForeignKey) {
                      return "cursor-pointer text-blue-600 hover:underline dark:text-blue-400";
                    }
                    return isEditableColumn(col)
                      ? "cursor-text"
                      : "cursor-default";
                  })()}
                  onClick={() => handleCellClick(col)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleCellClick(col);
                    }
                  }}
                  onDoubleClick={() => handleCellDoubleClick(col)}
                  role="button"
                  tabIndex={0}
                >
                  {String((row as any)[col])}
                </div>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-96">
                <div className="flex flex-col gap-2">
                  {popoverMode === "foreignKey"
                    ? (() => {
                        const meta = getColumnMeta(col);
                        const foreignKey = meta?.foreignKey ?? null;

                        return (
                          <div className="flex flex-col gap-2">
                            <div className="text-gray-700 text-xs dark:text-zinc-300">
                              Related row from
                              <span className="font-semibold">
                                {" "}
                                {foreignKey?.table}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                onChange={(event) =>
                                  setEditValue(event.target.value)
                                }
                                value={editValue}
                              />
                              <Button
                                aria-label="Search foreign key"
                                onClick={() => openForeignKeyDialog(col)}
                                size="icon"
                                type="button"
                                variant="outline"
                              >
                                <Search className="h-4 w-4" />
                              </Button>
                            </div>
                            {isForeignKeyLoading ? (
                              <div className="flex items-center gap-2 text-gray-600 text-xs dark:text-zinc-400">
                                <Loader className="h-3 w-3 animate-spin" />
                                Loading...
                              </div>
                            ) : foreignKeyError ? (
                              <div className="text-red-600 text-xs dark:text-red-400">
                                {foreignKeyError}
                              </div>
                            ) : foreignKeyRows.length === 0 ? (
                              <div className="text-gray-600 text-xs dark:text-zinc-400">
                                No related rows found.
                              </div>
                            ) : (
                              <ScrollArea className="max-h-64 space-y-3 overflow-auto">
                                {foreignKeyRows.map((rowItem, rowIndex) => (
                                  <div
                                    className="rounded border border-gray-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900"
                                    key={`${col}-${rowIndex}`}
                                  >
                                    <div className="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 text-xs">
                                      {Object.entries(rowItem).map(
                                        ([key, value]) => (
                                          <div className="contents" key={key}>
                                            <div className="text-gray-500 dark:text-zinc-400">
                                              {key}
                                            </div>
                                            <div className="text-gray-900 dark:text-zinc-100">
                                              {String(value)}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {foreignKeyHasMore && (
                                  <div className="text-gray-500 text-xs dark:text-zinc-400">
                                    Showing first {foreignKeyRows.length} rows.
                                  </div>
                                )}
                              </ScrollArea>
                            )}
                          </div>
                        );
                      })()
                    : (() => {
                        const meta = getColumnMeta(col);
                        const type = meta?.type ?? "";
                        const nullable = meta?.nullable ?? false;

                        const handleNullToggle = (checked: boolean) => {
                          if (checked) {
                            setLastNonNullValue(editValue);
                            setEditValue("");
                            setNullSelected(true);
                            return;
                          }
                          setNullSelected(false);
                          setEditValue(lastNonNullValue);
                        };

                        if (isBooleanType(type)) {
                          return (
                            <>
                              {nullable && (
                                <label className="flex items-center gap-2 text-gray-700 text-xs dark:text-zinc-300">
                                  <Checkbox
                                    checked={nullSelected}
                                    onCheckedChange={(checked) =>
                                      handleNullToggle(Boolean(checked))
                                    }
                                  />
                                  NULL
                                </label>
                              )}
                              <select
                                className="w-full rounded border border-gray-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                disabled={isSaving || nullSelected}
                                onChange={(event) =>
                                  setEditValue(event.target.value)
                                }
                                value={editValue}
                              >
                                {!nullable && (
                                  <option value="">Select value</option>
                                )}
                                <option value="true">True</option>
                                <option value="false">False</option>
                              </select>
                            </>
                          );
                        }

                        if (isEnumType(type)) {
                          return (
                            <>
                              {nullable && (
                                <label className="flex items-center gap-2 text-gray-700 text-xs">
                                  <Checkbox
                                    checked={nullSelected}
                                    onCheckedChange={(checked) =>
                                      handleNullToggle(Boolean(checked))
                                    }
                                  />
                                  NULL
                                </label>
                              )}
                              <select
                                className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                                disabled={isSaving || nullSelected}
                                onChange={(event) =>
                                  setEditValue(event.target.value)
                                }
                                value={editValue}
                              >
                                {!nullable && (
                                  <option value="">Select value</option>
                                )}
                                {getEnumValues(type).map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </>
                          );
                        }

                        return (
                          <>
                            {nullable && (
                              <label className="flex items-center gap-2 text-gray-700 text-xs">
                                <Checkbox
                                  checked={nullSelected}
                                  onCheckedChange={(checked) =>
                                    handleNullToggle(Boolean(checked))
                                  }
                                />
                                NULL
                              </label>
                            )}
                            <Input
                              disabled={isSaving || nullSelected}
                              onChange={(event) =>
                                setEditValue(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  saveEdit();
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  closePopover();
                                }
                              }}
                              step={
                                getInputTypeForColumn(col) === "datetime-local"
                                  ? 1
                                  : undefined
                              }
                              type={getInputTypeForColumn(col)}
                              value={editValue}
                            />
                          </>
                        );
                      })()}
                  {popoverMode === "edit" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        disabled={isSaving}
                        onClick={closePopover}
                        size="sm"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button disabled={isSaving} onClick={saveEdit} size="sm">
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                  {popoverMode === "foreignKey" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        disabled={isSaving}
                        onClick={closePopover}
                        size="sm"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                      <Button disabled={isSaving} onClick={saveEdit} size="sm">
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </td>
        ))}
      </tr>
      <Dialog
        onOpenChange={setIsForeignKeyDialogOpen}
        open={isForeignKeyDialogOpen}
      >
        <DialogContent className="max-h-[80vh] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Pick a related row</DialogTitle>
            <DialogDescription>
              Search and select a row from
              {foreignKeyDialogTable
                ? ` ${foreignKeyDialogTable}`
                : " the table"}
              .
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="-mx-4 max-h-[50vh] overflow-y-auto px-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Select
                  onValueChange={(value) =>
                    setForeignKeyDialogSearchColumn(value)
                  }
                  value={
                    foreignKeyDialogSearchColumn ||
                    foreignKeyDialogColumns[0] ||
                    ""
                  }
                >
                  <SelectTrigger className="w-full max-w-48">
                    <SelectValue placeholder="Select a column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Columns</SelectLabel>
                      {foreignKeyDialogColumns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Input
                  className="flex-1"
                  onChange={(event) =>
                    setForeignKeyDialogSearchValue(event.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (
                        foreignKeyDialogSearchValue.trim() === "" ||
                        isForeignKeyDialogLoading
                      ) {
                        toast.error("Please enter a search value");
                        return;
                      }
                      void handleForeignKeySearch();
                    }
                  }}
                  placeholder="Search..."
                  value={foreignKeyDialogSearchValue}
                />
                <Button
                  disabled={isForeignKeyDialogLoading}
                  onClick={handleForeignKeySearch}
                  type="button"
                >
                  {isForeignKeyDialogLoading ? "Searching..." : "Search"}
                </Button>
              </div>
              {foreignKeyDialogError ? (
                <div className="text-red-600 text-sm">
                  {foreignKeyDialogError}
                </div>
              ) : foreignKeyDialogRows.length === 0 ? (
                <div className="text-gray-600 text-sm">No results.</div>
              ) : (
                <ScrollArea className="overflow-auto rounded border border-gray-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {foreignKeyDialogColumns.map((column) => (
                          <th
                            className="border border-gray-200 px-2 py-2 font-semibold"
                            key={column}
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {foreignKeyDialogRows.map((rowItem, rowIndex) => (
                        <tr
                          className="cursor-pointer hover:bg-gray-50"
                          key={`fk-row-${rowIndex}`}
                          onClick={() => handleForeignKeyRowSelect(rowItem)}
                        >
                          {foreignKeyDialogColumns.map((column) => (
                            <td
                              className="h-4 truncate border border-gray-200 px-2 py-2"
                              key={`${rowIndex}-${column}`}
                            >
                              {String(rowItem[column])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
