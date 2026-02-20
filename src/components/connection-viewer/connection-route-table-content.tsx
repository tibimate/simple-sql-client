import {
  CommandIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash,
  XIcon,
} from "lucide-react";
import {
  ActiveFilters,
  DataTable,
  SearchDialog,
} from "@/components/connection-viewer";
import { AddRowDialog } from "@/components/connection-viewer/add-row-dialog";
import { EditRowDialog } from "@/components/connection-viewer/edit-row-dialog";
import type { ConnectionRouteConfig } from "@/components/connection-viewer/connection-route-types";
import { SqlQueryDialog } from "@/components/connection-viewer/sql-query-dialog";
import type { ConnectionRouteState } from "@/components/connection-viewer/use-connection-route-state";
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

type ConnectionRouteTableContentProps = {
  config: ConnectionRouteConfig;
  routeState: ConnectionRouteState;
};

export const ConnectionRouteTableContent = ({
  config,
  routeState,
}: ConnectionRouteTableContentProps) => {
  if (!(routeState.selectedTable && routeState.tableData)) {
    return null;
  }

  return (
    <div
      className={
        config.panelBackground
          ? "h-full bg-zinc-100 dark:bg-zinc-900"
          : "h-full"
      }
    >
      <div className="h-full overflow-auto" data-table-scroll>
        <div className="flex flex-col">
          {routeState.error && (
            <div className="m-4 rounded border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <div className="flex items-center justify-between">
                {routeState.error}
                <Button
                  onClick={() => routeState.setError(null)}
                  size="sm"
                  variant={config.outlineErrorCloseButton ? "outline" : undefined}
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
                disabled={!routeState.tableSchema}
                onClick={() => routeState.setIsAddDialogOpen(true)}
              >
                <PlusIcon className="size-3" />
                <span className="leading-none">Add</span>
              </Button>
              <Button
                className="flex items-center hover:bg-destructive/10 hover:text-destructive"
                disabled={routeState.selectedRows.size === 0}
                onClick={() => routeState.setIsDeleteDialogOpen(true)}
              >
                <Trash className="size-3" />
                <span className="leading-none">Delete</span>
              </Button>
              <Button
                className="flex items-center"
                onClick={() => routeState.setIsSqlDialogOpen(true)}
              >
                <CommandIcon className="size-3" />
                <span className="leading-none">SQL</span>
              </Button>
              <Button
                className="flex items-center"
                onClick={routeState.refreshTableData}
              >
                <RefreshCwIcon className="size-3" />
                <span className="leading-none">Refresh</span>
              </Button>
              <SearchDialog
                columns={routeState.tableData.columns}
                getInputTypeForColumn={routeState.getInputTypeForColumn}
                getOperatorsForColumn={routeState.getOperatorsForColumn}
                isSearching={routeState.isSearching}
                onClear={routeState.clearSearch}
                onFilterChange={(column, value, operator) => {
                  routeState.setSearchFilters({
                    ...routeState.searchFilters,
                    [column]: { operator, value },
                  });
                }}
                onOpenChange={routeState.setIsSearchDialogOpen}
                onRemoveFilter={routeState.removeFilter}
                onSearch={routeState.handleSearch}
                open={routeState.isSearchDialogOpen}
                searchFilters={routeState.searchFilters}
                selectedTable={routeState.selectedTable}
              />
            </div>
          </div>

          <ActiveFilters
            onClearAll={routeState.clearSearch}
            onRemoveFilter={routeState.removeFilter}
            searchFilters={routeState.searchFilters}
          />

          <DataTable
            columns={routeState.tableData.columns}
            getColumnMeta={routeState.getColumnMeta}
            getInputTypeForColumn={routeState.getInputTypeForColumn}
            isEditableColumn={routeState.isEditableColumn}
            isLoadingMore={routeState.isLoadingMore}
            isLoadingTable={routeState.isLoadingTable}
            onColumnClick={routeState.colClicked}
            onEditCell={routeState.handleEditCell}
            onEditRow={routeState.handleEditRow}
            onForeignKeyLookup={routeState.handleForeignKeyLookup}
            onForeignKeyTableQuery={routeState.handleForeignKeyTableQuery}
            onRowSelect={routeState.handleRowSelect}
            onSelectAll={routeState.handleSelectAll}
            rowCount={routeState.tableData.rows.length}
            rows={routeState.tableData.rows}
            selectedRows={routeState.selectedRows}
            sortColumn={routeState.sortColumn}
            sortOrder={routeState.sortOrder}
          />

          {routeState.tableSchema && (
            <AddRowDialog
              columns={routeState.tableSchema}
              isAdding={routeState.isAdding}
              onAdd={routeState.handleAddRow}
              onOpenChange={routeState.setIsAddDialogOpen}
              open={routeState.isAddDialogOpen}
            />
          )}

          {routeState.tableSchema && (
            <EditRowDialog
              columns={routeState.tableSchema}
              isUpdating={routeState.isUpdating}
              onOpenChange={routeState.setIsEditDialogOpen}
              onUpdate={routeState.handleUpdateRow}
              open={routeState.isEditDialogOpen}
              row={routeState.editingRow}
            />
          )}

          <SqlQueryDialog
            error={routeState.sqlError}
            isExecuting={routeState.isExecutingSql}
            onClearError={() => routeState.setSqlError(null)}
            onExecute={routeState.handleExecuteSql}
            onOpenChange={routeState.handleSqlDialogOpenChange}
            open={routeState.isSqlDialogOpen}
          />

          <AlertDialog
            onOpenChange={routeState.setIsDeleteDialogOpen}
            open={routeState.isDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {routeState.selectedRows.size} row
                  {routeState.selectedRows.size !== 1 ? "s" : ""}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  selected row
                  {routeState.selectedRows.size !== 1 ? "s" : ""} from the
                  database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={routeState.isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={routeState.isDeleting}
                  onClick={routeState.handleDeleteRows}
                  variant="destructive"
                >
                  {routeState.isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};