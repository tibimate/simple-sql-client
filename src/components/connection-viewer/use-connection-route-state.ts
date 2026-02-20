import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Connection } from "@/ipc/connections/schemas";
import { ipc } from "@/ipc/manager";
import { extractPrimaryTableName } from "@/utils/sql";
import type {
  ConnectionRouteConfig,
  FilterOperator,
  SearchFilterMap,
  TableSchemaColumn,
} from "./connection-route-types";
import {
  getInputTypeForColumnType,
  getOperatorsForColumnType,
  hasActiveFilters,
  mapActiveFilters,
} from "./connection-route-utils";

type UseConnectionRouteStateProps = {
  id: string;
  config: ConnectionRouteConfig;
};

export const useConnectionRouteState = ({
  id,
  config,
}: UseConnectionRouteStateProps) => {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<{
    columns: string[];
    rows: unknown[];
  } | null>(null);
  const [tableSchema, setTableSchema] = useState<Array<TableSchemaColumn> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilterMap>({});
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

  const loadTables = async () => {
    setIsLoading(true);
    try {
      const tableList = await ipc.client.database.listTables({
        connectionId: id,
      });
      setTables(tableList);
    } catch {
      setError("Failed to load tables");
    } finally {
      setIsLoading(false);
    }
  };

  const connectToDatabase = async () => {
    setIsConnecting(true);
    setError(null);
    setIsLoading(true);
    try {
      await ipc.client.database.connect({ connectionId: id });
      setIsConnected(true);
      await loadTables();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect";
      setError(message);
      setIsConnected(false);
      toast.error(message);
    } finally {
      setIsConnecting(false);
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

      const schema = await ipc.client.database.getTableSchema({
        connectionId: id,
        tableName,
      });

      setTableData(data);
      setTableSchema(schema);
      setSortColumn(null);
      setSortOrder("asc");
    } catch {
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
      setOffset(0);
      const data = await ipc.client.database.getTableData({
        connectionId: id,
        tableName,
        limit: 100,
        offset: 0,
        orderBy: column,
        order,
      });
      if (!data) {
        setError("No data returned from server");
        return;
      }
      setTableData(data);
      setSortColumn(column);
      setSortOrder(order);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load data";
      setError(`Failed to sort: ${errorMessage}`);
    } finally {
      setIsLoadingTable(false);
    }
  };

  const colClicked = (columnName: string) => {
    if (!selectedTable) {
      return;
    }

    setIsLoading(true);
    try {
      if (sortColumn === columnName) {
        const newOrder = sortOrder === "asc" ? "desc" : "asc";
        loadTableDataWithSort(selectedTable, columnName, newOrder);
      } else {
        loadTableDataWithSort(selectedTable, columnName, "asc");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInputTypeForColumn = (
    columnName: string
  ): "text" | "date" | "datetime-local" => {
    if (!tableSchema) {
      return "text";
    }

    const column = tableSchema.find((tableColumn) => tableColumn.name === columnName);
    if (!column) {
      return "text";
    }

    return getInputTypeForColumnType(column.type, config);
  };

  const getOperatorsForColumn = (
    columnName: string
  ): Array<{ value: string; label: string }> => {
    if (!tableSchema) {
      return [];
    }

    const column = tableSchema.find((tableColumn) => tableColumn.name === columnName);
    if (!column) {
      return [];
    }

    return getOperatorsForColumnType(column.type, config);
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
        filters: mapActiveFilters(searchFilters),
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
    const nextFilters = { ...searchFilters };
    delete nextFilters[columnToRemove];
    setSearchFilters(nextFilters);

    if (!selectedTable) {
      return;
    }

    try {
      setOffset(0);
      const data = await ipc.client.database.getTableData({
        connectionId: id,
        tableName: selectedTable,
        limit: 100,
        offset: 0,
        filters: hasActiveFilters(nextFilters)
          ? mapActiveFilters(nextFilters)
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
      const data = await ipc.client.database.getTableData({
        connectionId: id,
        tableName: selectedTable,
        limit: 100,
        offset: 0,
        filters: hasActiveFilters(searchFilters)
          ? mapActiveFilters(searchFilters)
          : undefined,
        orderBy: sortColumn || undefined,
        order: sortColumn ? sortOrder : undefined,
      });

      setTableData(data);
      setError(null);
    } catch {
      setError(`Failed to refresh ${selectedTable}`);
    } finally {
      setIsLoadingTable(false);
    }
  };

  const handleRowSelect = (index: number) => {
    const nextSelected = new Set(selectedRows);
    if (nextSelected.has(index)) {
      nextSelected.delete(index);
    } else {
      nextSelected.add(index);
    }
    setSelectedRows(nextSelected);
  };

  const handleSelectAll = () => {
    if (tableData && selectedRows.size === tableData.rows.length) {
      setSelectedRows(new Set());
    } else if (tableData) {
      setSelectedRows(new Set(tableData.rows.map((_, rowIndex) => rowIndex)));
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
        (rowIndex) => tableData.rows[rowIndex] as Record<string, unknown>
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
          } catch {
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
      const oldName = config.quoteIdentifier(renamingTable);
      const quotedNewName = config.quoteIdentifier(newName);
      await ipc.client.database.executeQuery({
        connectionId: id,
        query: `ALTER TABLE ${oldName} RENAME TO ${quotedNewName};`,
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
      const quotedName = config.quoteIdentifier(deletingTable);
      const cascade =
        config.supportsDropCascade && ignoreForeignKeys ? " CASCADE" : "";
      await ipc.client.database.executeQuery({
        connectionId: id,
        query: `DROP TABLE ${quotedName}${cascade};`,
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

    const column = tableSchema.find((tableColumn) => tableColumn.name === columnName);
    return column
      ? {
          type: column.type,
          nullable: column.nullable,
          foreignKey: column.foreignKey ?? null,
        }
      : null;
  };

  const formatDisplayValue = (columnName: string, value: string): string => {
    const meta = getColumnMeta(columnName);
    if (!meta) {
      return value;
    }

    const normalizedType = meta.type.toLowerCase();
    if (
      normalizedType.includes("date") &&
      !normalizedType.includes("time") &&
      !normalizedType.includes("timestamp")
    ) {
      return value.slice(0, 10);
    }

    if (
      normalizedType.includes("timestamp") ||
      normalizedType.includes("datetime") ||
      normalizedType.includes("time")
    ) {
      if (value.includes("T")) {
        const normalizedValue = value.replace("T", " ");
        return normalizedValue.length === 16
          ? `${normalizedValue}:00`
          : normalizedValue;
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

    const normalizedType = meta.type.toLowerCase();
    const isDateLike =
      normalizedType.includes("date") ||
      normalizedType.includes("timestamp") ||
      normalizedType.includes("datetime");
    const isTimeOnly = normalizedType.includes("time") && !isDateLike;

    if (
      isDateLike &&
      !isTimeOnly &&
      (originalValue instanceof Date ||
        (typeof originalValue === "string" && originalValue.includes("GMT")))
    ) {
      const parsedDate = new Date(value);
      return Number.isNaN(parsedDate.getTime()) ? value : parsedDate;
    }

    return formatDisplayValue(columnName, value);
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

      setTableData((previous) => {
        if (!previous) {
          return previous;
        }

        const rowIndex = previous.rows.indexOf(row);
        if (rowIndex === -1) {
          return previous;
        }

        const nextRows = [...previous.rows];
        const nextValue = getNextDisplayValue(column, value, row[column]);
        nextRows[rowIndex] = {
          ...(nextRows[rowIndex] as Record<string, unknown>),
          [column]: nextValue,
        };

        return { ...previous, rows: nextRows };
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

    const column = tableSchema.find((tableColumn) => tableColumn.name === columnName);
    return column ? !column.autoIncrement : true;
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
      operator: FilterOperator;
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

  const handleDisconnect = async () => {
    try {
      await ipc.client.database.disconnect({ connectionId: id });
      setIsConnected(false);
      setTables([]);
      setSelectedTable(null);
      setTableData(null);
      setSearchFilters({});
    } catch {
      setError("Failed to disconnect");
    }
  };

  useEffect(() => {
    const loadConnection = async () => {
      try {
        setSelectedTable(null);
        setTableData(null);
        setSortColumn(null);
        setSortOrder("asc");
        setTables([]);
        setOffset(0);
        setIsLoadingMore(false);
        setSearchFilters({});

        const data = await ipc.client.connections.getById({ id });
        if (data?.type === config.connectionType) {
          setConnection(data);
          await connectToDatabase();
        } else {
          setError("Connection not found or invalid type");
        }
      } catch {
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
      if (isConnected) {
        ipc.client.database
          .disconnect({ connectionId: id })
          .catch(console.error);
      }
    };
  }, [id, config.connectionType]);

  useEffect(() => {
    const scrollContainer = document.querySelector(
      "[data-table-scroll]"
    ) as HTMLElement;
    if (!scrollContainer) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
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
              filters: mapActiveFilters(searchFilters),
              orderBy: sortColumn || undefined,
              order: sortColumn ? sortOrder : undefined,
            });

            if (data && data.rows.length > 0) {
              setTableData((previous) =>
                previous
                  ? {
                      columns: previous.columns,
                      rows: [...previous.rows, ...data.rows],
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

  return {
    connection,
    createTableError,
    deleteTableError,
    deletingTable,
    editingRow,
    error,
    isAddDialogOpen,
    isAdding,
    isConnected,
    isConnecting,
    isCreateTableOpen,
    isCreatingTable,
    isDeleteDialogOpen,
    isDeleteTableOpen,
    isDeleting,
    isDeletingTable,
    isEditDialogOpen,
    isExecutingSql,
    isLoading,
    isLoadingMore,
    isLoadingTable,
    isRenameTableOpen,
    isRenamingTable,
    isSearchDialogOpen,
    isSearching,
    isSqlDialogOpen,
    isUpdating,
    loadTables,
    loadTableData,
    renamingTable,
    renameTableError,
    searchFilters,
    selectedRows,
    selectedTable,
    setError,
    setIsAddDialogOpen,
    setIsCreateTableOpen,
    setIsDeleteDialogOpen,
    setIsDeleteTableOpen,
    setIsEditDialogOpen,
    setIsRenameTableOpen,
    setIsSearchDialogOpen,
    setIsSqlDialogOpen,
    setSearchFilters,
    setSqlError,
    sortColumn,
    sortOrder,
    sqlError,
    tableData,
    tableSchema,
    tables,
    colClicked,
    connectToDatabase,
    getColumnMeta,
    getInputTypeForColumn,
    getOperatorsForColumn,
    handleAddRow,
    handleAddTable,
    handleCreateTable,
    handleDeleteRows,
    handleDeleteTable,
    handleDeleteTableOpen,
    handleDisconnect,
    handleEditCell,
    handleEditRow,
    handleExecuteSql,
    handleForeignKeyLookup,
    handleForeignKeyTableQuery,
    handleRenameTable,
    handleRenameTableOpen,
    handleRowSelect,
    handleSearch,
    handleSelectAll,
    handleSqlDialogOpenChange,
    handleUpdateRow,
    isEditableColumn,
    refreshTableData,
    removeFilter,
    clearSearch,
  };
};

export type ConnectionRouteState = ReturnType<typeof useConnectionRouteState>;