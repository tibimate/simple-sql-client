import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  CommandIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ActiveFilters,
  ConnectionHeader,
  CreateTableDialog,
  DataTable,
  DeleteTableDialog,
  LoadingState,
  NoTableSelectedState,
  NotConnectedState,
  RenameTableDialog,
  SearchDialog,
  TableSidebar,
} from "@/components/connection-viewer";
import { AddRowDialog } from "@/components/connection-viewer/add-row-dialog";
import { EditRowDialog } from "@/components/connection-viewer/edit-row-dialog";
import { SqlQueryDialog } from "@/components/connection-viewer/sql-query-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { PostgresConnection } from "@/ipc/connections/schemas";
import { ipc } from "@/ipc/manager";
import { extractPrimaryTableName } from "@/utils/sql";

export const Route = createFileRoute("/postgres/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = useParams({ from: "/postgres/$id" });
  const [connection, setConnection] = useState<PostgresConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{
    columns: string[];
    rows: unknown[];
  } | null>(null);
  const [tableSchema, setTableSchema] = useState<Array<{
    name: string;
    type: string;
    nullable: boolean;
    autoIncrement: boolean;
    primaryKey: boolean;
    foreignKey?: { table: string; column: string } | null;
  }> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<{
    [key: string]: {
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
    };
  }>({});
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSqlDialogOpen, setIsSqlDialogOpen] = useState(false);
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [createTableError, setCreateTableError] = useState<string | null>(null);
  const [isRenameTableOpen, setIsRenameTableOpen] = useState(false);
  const [renamingTable, setRenamingTable] = useState<string | null>(null);
  const [isRenamingTable, setIsRenamingTable] = useState(false);
  const [renameTableError, setRenameTableError] = useState<string | null>(null);
  const [isDeleteTableOpen, setIsDeleteTableOpen] = useState(false);
  const [deletingTable, setDeletingTable] = useState<string | null>(null);
  const [isDeletingTable, setIsDeletingTable] = useState(false);
  const [deleteTableError, setDeleteTableError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(
    null
  );

  useEffect(() => {
    console.log("Loading connection with ID:", id);
    const loadConnection = async () => {
      try {
        // Reset states when switching connections
        setSelectedTable(null);
        setTableData(null);
        setSortColumn(null);
        setSortOrder("asc");
        setTables([]);
        setOffset(0);
        setIsLoadingMore(false);
        setSearchFilters({});

        const data = await ipc.client.connections.getById({ id });
        if (data?.type === "postgres") {
          setConnection(data);
          // Auto-connect
          await connectToDatabase();
        } else {
          setError("Connection not found or invalid type");
        }
      } catch (_err) {
        setError("Failed to load connection");
      } finally {
        setIsLoading(false);
      }
    };

    loadConnection();

    const handleConnectionUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id === id) {
        setIsLoading(true);
        loadConnection();
      }
    };

    window.addEventListener("connections:updated", handleConnectionUpdated);

    return () => {
      window.removeEventListener(
        "connections:updated",
        handleConnectionUpdated
      );
      // Cleanup: disconnect when component unmounts
      if (isConnected) {
        ipc.client.database
          .disconnect({ connectionId: id })
          .catch(console.error);
      }
    };
  }, [id]);

  const connectToDatabase = async () => {
    setIsConnecting(true);
    setError(null);
    setIsLoading(true);
    try {
      await ipc.client.database.connect({ connectionId: id });
      setIsConnected(true);
      await loadTables();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
      setIsLoading(false);
    }
  };

  const loadTables = async () => {
    setIsLoading(true);
    try {
      const tableList = await ipc.client.database.listTables({
        connectionId: id,
      });
      setTables(tableList);
    } catch (_err) {
      setError("Failed to load tables");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTableData = async (tableName: string) => {
    setIsLoadingTable(true);
    setError(null);
    try {
      setSelectedTable(tableName);
      setOffset(0);
      setSearchFilters({});
      setSelectedRows(new Set());
      const data = await ipc.client.database.getTableData({
        connectionId: id,
        tableName,
        limit: 100,
        offset: 0,
      });

      // Load table schema to determine column types
      const schema = await ipc.client.database.getTableSchema({
        connectionId: id,
        tableName,
      });

      setTableData(data);
      setTableSchema(schema);
      setSortColumn(null);
      setSortOrder("asc");
    } catch (_err) {
      setError(`Failed to load data from ${tableName}`);
    } finally {
      setIsLoadingTable(false);
    }
  };

  const loadTableDataWithSort = async (
    tableName: string,
    column: string,
    order: "asc" | "desc"
  ) => {
    setIsLoadingTable(true);
    try {
      console.log("Sorting by:", column, "Order:", order);
      setOffset(0);
      const data = await ipc.client.database.getTableData({
        connectionId: id,
        tableName,
        limit: 100,
        offset: 0,
        orderBy: column,
        order,
      });
      console.log("Sorted data received:", data);
      if (!data) {
        setError("No data returned from server");
        return;
      }
      setTableData(data);
      setSortColumn(column);
      setSortOrder(order);
      setError(null);
    } catch (err) {
      console.error("Sort error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load data";
      setError(`Failed to sort: ${errorMessage}`);
    } finally {
      setIsLoadingTable(false);
    }
  };

  const colClicked = (col: string) => {
    if (!selectedTable) {
      return;
    }
    setIsLoading(true);
    try {
      // Toggle sort order if clicking the same column, otherwise sort ascending
      if (sortColumn === col) {
        const newOrder = sortOrder === "asc" ? "desc" : "asc";
        loadTableDataWithSort(selectedTable, col, newOrder);
      } else {
        loadTableDataWithSort(selectedTable, col, "asc");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isNumericType = (type: string): boolean => {
    const numericTypes = [
      "integer",
      "bigint",
      "smallint",
      "numeric",
      "decimal",
      "real",
      "double precision",
      "float",
      "int",
      "int2",
      "int4",
      "int8",
    ];
    return numericTypes.some((t) => type.toLowerCase().includes(t));
  };

  const isTextType = (type: string): boolean => {
    const textTypes = ["character", "text", "varchar", "string", "char"];
    return textTypes.some((t) => type.toLowerCase().includes(t));
  };

  const isDateTimeType = (type: string): boolean => {
    const dateTimeTypes = [
      "timestamp",
      "date",
      "time",
      "datetime",
      "timestamptz",
      "timestamp with time zone",
      "timestamp without time zone",
    ];
    return dateTimeTypes.some((t) => type.toLowerCase().includes(t));
  };

  const isDateType = (type: string): boolean => {
    return (
      type.toLowerCase().includes("date") &&
      !type.toLowerCase().includes("timestamp")
    );
  };

  const getInputTypeForColumn = (
    columnName: string
  ): "text" | "date" | "datetime-local" => {
    if (!tableSchema) {
      return "text";
    }

    const column = tableSchema.find((col) => col.name === columnName);
    if (!column) {
      return "text";
    }

    if (isDateType(column.type)) {
      return "date";
    }
    if (isDateTimeType(column.type)) {
      return "datetime-local";
    }

    return "text";
  };

  const getOperatorsForColumn = (
    columnName: string
  ): Array<{ value: string; label: string }> => {
    if (!tableSchema) {
      return [];
    }

    const column = tableSchema.find((col) => col.name === columnName);
    if (!column) {
      return [];
    }

    const allOperators = [
      { value: "contains", label: "Contains" },
      { value: "equals", label: "Equals" },
      { value: "startsWith", label: "Starts with" },
      { value: "endsWith", label: "Ends with" },
      { value: "gt", label: "Greater than" },
      { value: "lt", label: "Less than" },
      { value: "gte", label: "Greater or equal" },
      { value: "lte", label: "Less or equal" },
    ];

    // For numeric columns, only show numeric operators
    if (isNumericType(column.type)) {
      return allOperators.filter((op) =>
        ["equals", "gt", "lt", "gte", "lte"].includes(op.value)
      );
    }

    // For date/time columns, show comparison operators only
    if (isDateTimeType(column.type)) {
      return allOperators.filter((op) =>
        ["equals", "gt", "lt", "gte", "lte"].includes(op.value)
      );
    }

    // For text columns, show all operators
    if (isTextType(column.type)) {
      return allOperators;
    }

    // Default: show all operators
    return allOperators;
  };

  const handleSearch = async () => {
    if (!selectedTable) {
      return;
    }

    try {
      setIsSearching(true);
      setOffset(0);

      const data = await ipc.client.database.getTableData({
        connectionId: id,
        tableName: selectedTable,
        limit: 100,
        offset: 0,
        filters: Object.entries(searchFilters)
          .filter(([_, { value }]) => value.trim() !== "")
          .map(([column, { value, operator }]) => ({
            column,
            value,
            operator,
          })),
        orderBy: sortColumn || undefined,
        order: sortColumn ? sortOrder : undefined,
      });

      setTableData(data);
      setIsSearchDialogOpen(false);
      setError(null);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search");
    } finally {
      setIsSearching(false);
    }
  };

  const removeFilter = async (columnToRemove: string) => {
    const newFilters = { ...searchFilters };
    delete newFilters[columnToRemove];
    setSearchFilters(newFilters);

    if (!selectedTable) {
      return;
    }

    try {
      setOffset(0);
      const hasActiveFilters = Object.values(newFilters).some(
        (f) => f.value.trim() !== ""
      );

      const data = await ipc.client.database.getTableData({
        connectionId: id,
        tableName: selectedTable,
        limit: 100,
        offset: 0,
        filters: hasActiveFilters
          ? Object.entries(newFilters)
              .filter(([_, { value }]) => value.trim() !== "")
              .map(([column, { value, operator }]) => ({
                column,
                value,
                operator,
              }))
          : undefined,
        orderBy: sortColumn || undefined,
        order: sortColumn ? sortOrder : undefined,
      });

      setTableData(data);
      setError(null);
    } catch (err) {
      console.error("Remove filter error:", err);
      setError("Failed to reload data");
    }
  };

  const clearSearch = async () => {
    setSearchFilters({});
    if (selectedTable) {
      await loadTableData(selectedTable);
    }
  };

  const refreshTableData = async () => {
    if (!selectedTable) {
      return;
    }

    try {
      setIsLoadingTable(true);
      setOffset(0);
      setSelectedRows(new Set());
      const hasActiveFilters = Object.values(searchFilters).some(
        (f) => f.value.trim() !== ""
      );

      const data = await ipc.client.database.getTableData({
        connectionId: id,
        tableName: selectedTable,
        limit: 100,
        offset: 0,
        filters: hasActiveFilters
          ? Object.entries(searchFilters)
              .filter(([_, { value }]) => value.trim() !== "")
              .map(([column, { value, operator }]) => ({
                column,
                value,
                operator,
              }))
          : undefined,
        orderBy: sortColumn || undefined,
        order: sortColumn ? sortOrder : undefined,
      });

      setTableData(data);
      setError(null);
    } catch (_err) {
      setError(`Failed to refresh ${selectedTable}`);
    } finally {
      setIsLoadingTable(false);
    }
  };

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (tableData && selectedRows.size === tableData.rows.length) {
      setSelectedRows(new Set());
    } else if (tableData) {
      setSelectedRows(new Set(tableData.rows.map((_, idx) => idx)));
    }
  };

  const handleAddRow = async (values: Record<string, string>) => {
    if (!selectedTable) {
      return;
    }

    try {
      setIsAdding(true);
      await ipc.client.database.insertRow({
        connectionId: id,
        tableName: selectedTable,
        values,
      });

      setIsAddDialogOpen(false);
      await refreshTableData();
      toast.success("Row added");
      setError(null);
    } catch (err) {
      console.error("Add row error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCreateTable = async (payload: {
    query: string;
    tableName: string;
  }) => {
    try {
      setIsCreatingTable(true);
      setCreateTableError(null);
      await ipc.client.database.executeQuery({
        connectionId: id,
        query: payload.query,
      });

      setIsCreateTableOpen(false);
      await loadTables();
      await loadTableData(payload.tableName);
      toast.success("Table created");
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCreateTableError(message);
      toast.error(message);
    } finally {
      setIsCreatingTable(false);
    }
  };

  const handleDeleteRows = async () => {
    if (!(selectedTable && tableData) || selectedRows.size === 0) {
      return;
    }

    try {
      setIsDeleting(true);
      const rowsToDelete = Array.from(selectedRows).map(
        (idx) => tableData.rows[idx] as Record<string, unknown>
      );

      await ipc.client.database.deleteRows({
        connectionId: id,
        tableName: selectedTable,
        rows: rowsToDelete,
      });

      setIsDeleteDialogOpen(false);
      setSelectedRows(new Set());
      await refreshTableData();
      toast.success("Row(s) deleted");
      setError(null);
    } catch (err) {
      console.error("Delete rows error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExecuteSql = async (query: string) => {
    try {
      setIsExecutingSql(true);
      setSqlError(null);
      const result = await ipc.client.database.executeQuery({
        connectionId: id,
        query,
      });

      const tableName = extractPrimaryTableName(query);
      const isCreateTable = /\bcreate\s+table\b/i.test(query);

      if (isCreateTable) {
        await loadTables();
        if (tableName) {
          await loadTableData(tableName);
        }
      } else {
        setTableData(result);
        if (tableName) {
          setSelectedTable(tableName);
          try {
            const schema = await ipc.client.database.getTableSchema({
              connectionId: id,
              tableName,
            });
            setTableSchema(schema);
          } catch (_err) {
            // Ignore schema failures for ad-hoc queries.
          }
        }
      }
      setSelectedRows(new Set());
      setIsSqlDialogOpen(false);
      setSqlError(null);
      setError(null);
    } catch (err) {
      console.error("Execute SQL error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setSqlError(message);
      setError(message);
    } finally {
      setIsExecutingSql(false);
    }
  };

  const handleSqlDialogOpenChange = (nextOpen: boolean) => {
    setIsSqlDialogOpen(nextOpen);
    setSqlError(null);
  };

  const handleAddTable = () => {
    setCreateTableError(null);
    setIsCreateTableOpen(true);
  };

  const handleRenameTableOpen = (tableName: string) => {
    setRenamingTable(tableName);
    setRenameTableError(null);
    setIsRenameTableOpen(true);
  };

  const handleRenameTable = async (newName: string) => {
    if (!renamingTable) {
      return;
    }

    try {
      setIsRenamingTable(true);
      setRenameTableError(null);
      await ipc.client.database.executeQuery({
        connectionId: id,
        query: `ALTER TABLE "${renamingTable}" RENAME TO "${newName}";`,
      });

      setIsRenameTableOpen(false);
      if (selectedTable === renamingTable) {
        setSelectedTable(newName);
      }
      await loadTables();
      toast.success("Table renamed");
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setRenameTableError(message);
      toast.error(message);
    } finally {
      setIsRenamingTable(false);
    }
  };

  const handleDeleteTableOpen = (tableName: string) => {
    setDeletingTable(tableName);
    setDeleteTableError(null);
    setIsDeleteTableOpen(true);
  };

  const handleDeleteTable = async (ignoreForeignKeys: boolean) => {
    if (!deletingTable) {
      return;
    }

    try {
      setIsDeletingTable(true);
      setDeleteTableError(null);
      const cascade = ignoreForeignKeys ? " CASCADE" : "";
      await ipc.client.database.executeQuery({
        connectionId: id,
        query: `DROP TABLE "${deletingTable}"${cascade};`,
      });

      setIsDeleteTableOpen(false);
      if (selectedTable === deletingTable) {
        setSelectedTable(null);
        setTableData(null);
      }
      await loadTables();
      toast.success("Table deleted");
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setDeleteTableError(message);
      toast.error(message);
    } finally {
      setIsDeletingTable(false);
    }
  };

  const handleEditRow = (row: Record<string, unknown>) => {
    setEditingRow(row);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRow = async (
    values: Record<string, string>,
    originalRow: Record<string, unknown>
  ) => {
    if (!selectedTable) {
      return;
    }

    try {
      setIsUpdating(true);
      await ipc.client.database.updateRow({
        connectionId: id,
        tableName: selectedTable,
        values,
        originalRow,
      });

      setIsEditDialogOpen(false);
      setEditingRow(null);
      await refreshTableData();
      toast.success("Row updated");
      setError(null);
    } catch (err) {
      console.error("Update row error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditCell = async (
    row: Record<string, unknown>,
    column: string,
    value: string
  ) => {
    if (!selectedTable) {
      return;
    }

    try {
      setIsUpdating(true);
      await ipc.client.database.updateRow({
        connectionId: id,
        tableName: selectedTable,
        values: { [column]: value },
        originalRow: row,
      });
      setTableData((prev) => {
        if (!prev) {
          return prev;
        }
        const rowIndex = prev.rows.indexOf(row);
        if (rowIndex === -1) {
          return prev;
        }
        const nextRows = [...prev.rows];
        const nextValue = getNextDisplayValue(column, value, row[column]);
        nextRows[rowIndex] = {
          ...(nextRows[rowIndex] as Record<string, unknown>),
          [column]: nextValue,
        };
        return { ...prev, rows: nextRows };
      });
      toast.success("Cell updated");
      setError(null);
    } catch (err) {
      console.error("Update cell error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const isEditableColumn = (columnName: string): boolean => {
    if (!tableSchema) {
      return true;
    }
    const column = tableSchema.find((col) => col.name === columnName);
    return column ? !column.autoIncrement : true;
  };

  const getColumnMeta = (
    columnName: string
  ): {
    type: string;
    nullable: boolean;
    foreignKey?: { table: string; column: string } | null;
  } | null => {
    if (!tableSchema) {
      return null;
    }
    const column = tableSchema.find((col) => col.name === columnName);
    return column
      ? {
          type: column.type,
          nullable: column.nullable,
          foreignKey: column.foreignKey ?? null,
        }
      : null;
  };

  const handleForeignKeyLookup = async (
    foreignKey: { table: string; column: string },
    value: unknown
  ): Promise<{ rows: Array<Record<string, unknown>>; hasMore: boolean }> => {
    if (value === null || value === undefined || value === "") {
      return { rows: [], hasMore: false };
    }
    return await ipc.client.database.getForeignKeyRows({
      connectionId: id,
      tableName: foreignKey.table,
      columnName: foreignKey.column,
      value: String(value),
      limit: 5,
    });
  };

  const handleForeignKeyTableQuery = async (params: {
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
  }): Promise<{ columns: string[]; rows: unknown[] }> => {
    return await ipc.client.database.getTableData({
      connectionId: id,
      tableName: params.tableName,
      limit: params.limit,
      offset: params.offset,
      filters: params.filters,
      orderBy: params.orderBy,
      order: params.order,
    });
  };

  const formatDisplayValue = (columnName: string, value: string): string => {
    const meta = getColumnMeta(columnName);
    if (!meta) {
      return value;
    }
    const type = meta.type.toLowerCase();
    if (
      type.includes("date") &&
      !type.includes("time") &&
      !type.includes("timestamp")
    ) {
      return value.slice(0, 10);
    }
    if (
      type.includes("timestamp") ||
      type.includes("datetime") ||
      type.includes("time")
    ) {
      if (value.includes("T")) {
        const normalized = value.replace("T", " ");
        return normalized.length === 16 ? `${normalized}:00` : normalized;
      }
      return value.length === 16 ? `${value}:00` : value;
    }
    return value;
  };

  const getNextDisplayValue = (
    columnName: string,
    value: string,
    originalValue: unknown
  ): unknown => {
    if (value === "") {
      return null;
    }
    const meta = getColumnMeta(columnName);
    if (!meta) {
      return value;
    }
    const type = meta.type.toLowerCase();
    const isDateLike =
      type.includes("date") ||
      type.includes("timestamp") ||
      type.includes("datetime");
    const isTimeOnly = type.includes("time") && !isDateLike;

    if (
      isDateLike &&
      !isTimeOnly &&
      (originalValue instanceof Date ||
        (typeof originalValue === "string" && originalValue.includes("GMT")))
    ) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed;
    }

    return formatDisplayValue(columnName, value);
  };

  useEffect(() => {
    const scrollContainer = document.querySelector(
      "[data-table-scroll]"
    ) as HTMLElement;
    if (!scrollContainer) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      // Load more when user is 100px from the bottom
      if (
        scrollHeight - scrollTop - clientHeight < 100 &&
        !isLoadingMore &&
        tableData &&
        tableData.rows.length > 0
      ) {
        if (!selectedTable || isLoadingMore || !tableData) {
          return;
        }

        const loadMoreImpl = async () => {
          try {
            setIsLoadingMore(true);
            const newOffset = offset + 100;
            const data = await ipc.client.database.getTableData({
              connectionId: id,
              tableName: selectedTable,
              limit: 100,
              offset: newOffset,
              filters: Object.entries(searchFilters)
                .filter(([_, { value }]) => value.trim() !== "")
                .map(([column, { value, operator }]) => ({
                  column,
                  value,
                  operator,
                })),
              orderBy: sortColumn || undefined,
              order: sortColumn ? sortOrder : undefined,
            });

            if (data && data.rows.length > 0) {
              setTableData((prev) =>
                prev
                  ? {
                      columns: prev.columns,
                      rows: [...prev.rows, ...data.rows],
                    }
                  : data
              );
              setOffset(newOffset);
            }
          } catch (err) {
            console.error("Load more error:", err);
            setError("Failed to load more data");
          } finally {
            setIsLoadingMore(false);
          }
        };

        loadMoreImpl();
      }
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [
    isLoadingMore,
    tableData,
    selectedTable,
    offset,
    id,
    sortColumn,
    sortOrder,
    searchFilters,
  ]);

  if (isLoading) {
    return <div className="p-6">Loading connection...</div>;
  }

  if (error && !connection) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!connection) {
    return <div className="p-6 text-red-600">Connection not found</div>;
  }

  return (
    <div className="flex w-full flex-col">
      <ConnectionHeader
        connection={connection}
        isConnected={isConnected}
        isConnecting={isConnecting}
        isLoading={isLoading}
        onConnect={connectToDatabase}
        onDisconnect={async () => {
          try {
            await ipc.client.database.disconnect({ connectionId: id });
            setIsConnected(false);
            setTables([]);
            setSelectedTable(null);
            setTableData(null);
            setSearchFilters({});
          } catch (_err) {
            setError("Failed to disconnect");
          }
        }}
        onRefreshTables={loadTables}
      />

      <div className="h-screen pt-17 pb-8">
        <div className="flex h-full">
          <TableSidebar
            isConnected={isConnected}
            onAddTable={handleAddTable}
            onDeleteTable={handleDeleteTableOpen}
            onRenameTable={handleRenameTableOpen}
            onSelectTable={loadTableData}
            selectedTable={selectedTable}
            tables={tables}
          />

          {/* Main content area */}
          <div className="h-full min-w-0 flex-1 overflow-auto">
            {isConnected ? (
              selectedTable ? (
                tableData ? (
                  <div className="h-full bg-zinc-100 dark:bg-zinc-900">
                    <div className="h-full overflow-auto" data-table-scroll>
                      <div className="flex flex-col">
                        {error && (
                          <div className="m-4 rounded border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                            <div className="flex items-center justify-between">
                              {error}
                              <Button
                                onClick={() => setError(null)}
                                size="sm"
                                variant="outline"
                              >
                                <XIcon className="size-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between bg-zinc-100 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
                          <div className="flex items-center gap-2">
                            <Button
                              className="flex items-center"
                              disabled={!tableSchema}
                              onClick={() => setIsAddDialogOpen(true)}
                            >
                              <PlusIcon />
                              <span className="leading-none">Add</span>
                            </Button>
                            <Button
                              className="flex items-center hover:bg-destructive/10 hover:text-destructive"
                              disabled={selectedRows.size === 0}
                              onClick={() => setIsDeleteDialogOpen(true)}
                            >
                              <Trash className="size-3" />
                              <span className="leading-none">Delete</span>
                            </Button>
                            <Button
                              className="flex items-center"
                              onClick={() => setIsSqlDialogOpen(true)}
                            >
                              <CommandIcon className="size-3" />
                              <span className="leading-none">SQL</span>
                            </Button>
                            <Button
                              className="flex items-center"
                              onClick={() => refreshTableData()}
                            >
                              <RefreshCwIcon className="size-3" />
                              <span className="leading-none">Refresh</span>
                            </Button>
                            <SearchDialog
                              columns={tableData.columns}
                              getInputTypeForColumn={getInputTypeForColumn}
                              getOperatorsForColumn={getOperatorsForColumn}
                              isSearching={isSearching}
                              onClear={clearSearch}
                              onFilterChange={(col, value, operator) => {
                                setSearchFilters({
                                  ...searchFilters,
                                  [col]: {
                                    operator: operator as
                                      | "contains"
                                      | "equals"
                                      | "startsWith"
                                      | "endsWith"
                                      | "gt"
                                      | "lt"
                                      | "gte"
                                      | "lte",
                                    value,
                                  },
                                });
                              }}
                              onOpenChange={setIsSearchDialogOpen}
                              onRemoveFilter={removeFilter}
                              onSearch={handleSearch}
                              open={isSearchDialogOpen}
                              searchFilters={searchFilters}
                              selectedTable={selectedTable}
                            />
                          </div>
                        </div>

                        <ActiveFilters
                          onClearAll={clearSearch}
                          onRemoveFilter={removeFilter}
                          searchFilters={searchFilters}
                        />

                        <DataTable
                          columns={tableData.columns}
                          getColumnMeta={getColumnMeta}
                          getInputTypeForColumn={getInputTypeForColumn}
                          isEditableColumn={isEditableColumn}
                          isLoadingMore={isLoadingMore}
                          isLoadingTable={isLoadingTable}
                          onColumnClick={colClicked}
                          onEditCell={handleEditCell}
                          onEditRow={handleEditRow}
                          onForeignKeyLookup={handleForeignKeyLookup}
                          onForeignKeyTableQuery={handleForeignKeyTableQuery}
                          onRowSelect={handleRowSelect}
                          onSelectAll={handleSelectAll}
                          rowCount={tableData.rows.length}
                          rows={tableData.rows}
                          selectedRows={selectedRows}
                          sortColumn={sortColumn}
                          sortOrder={sortOrder}
                        />
                        {tableSchema && (
                          <AddRowDialog
                            columns={tableSchema}
                            isAdding={isAdding}
                            onAdd={handleAddRow}
                            onOpenChange={setIsAddDialogOpen}
                            open={isAddDialogOpen}
                          />
                        )}
                        {tableSchema && (
                          <EditRowDialog
                            columns={tableSchema}
                            isUpdating={isUpdating}
                            onOpenChange={setIsEditDialogOpen}
                            onUpdate={handleUpdateRow}
                            open={isEditDialogOpen}
                            row={editingRow}
                          />
                        )}
                        <SqlQueryDialog
                          error={sqlError}
                          isExecuting={isExecutingSql}
                          onClearError={() => setSqlError(null)}
                          onExecute={handleExecuteSql}
                          onOpenChange={handleSqlDialogOpenChange}
                          open={isSqlDialogOpen}
                        />
                        <AlertDialog
                          onOpenChange={setIsDeleteDialogOpen}
                          open={isDeleteDialogOpen}
                        >
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete {selectedRows.size} row
                                {selectedRows.size !== 1 ? "s" : ""}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the selected row
                                {selectedRows.size !== 1 ? "s" : ""} from the
                                database.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                disabled={isDeleting}
                                onClick={handleDeleteRows}
                                variant="destructive"
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ) : (
                  <LoadingState />
                )
              ) : (
                <NoTableSelectedState />
              )
            ) : (
              <NotConnectedState />
            )}
          </div>
        </div>
      </div>
      {connection && (
        <CreateTableDialog
          dbType={connection.type}
          error={createTableError}
          isCreating={isCreatingTable}
          onCreate={handleCreateTable}
          onOpenChange={setIsCreateTableOpen}
          open={isCreateTableOpen}
        />
      )}
      {renamingTable && (
        <RenameTableDialog
          error={renameTableError}
          isRenaming={isRenamingTable}
          onOpenChange={setIsRenameTableOpen}
          onRename={handleRenameTable}
          open={isRenameTableOpen}
          tableName={renamingTable}
        />
      )}
      {deletingTable && (
        <DeleteTableDialog
          error={deleteTableError}
          isDeleting={isDeletingTable}
          onDelete={handleDeleteTable}
          onOpenChange={setIsDeleteTableOpen}
          open={isDeleteTableOpen}
          tableName={deletingTable}
        />
      )}
    </div>
  );
}
