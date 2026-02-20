import { CreateTableDialog, DeleteTableDialog, RenameTableDialog } from "@/components/connection-viewer";
import type { ConnectionRouteState } from "@/components/connection-viewer/use-connection-route-state";

type ConnectionRouteDialogsProps = {
  routeState: ConnectionRouteState;
};

export const ConnectionRouteDialogs = ({
  routeState,
}: ConnectionRouteDialogsProps) => {
  return (
    <>
      {routeState.connection && (
        <CreateTableDialog
          dbType={routeState.connection.type}
          error={routeState.createTableError}
          isCreating={routeState.isCreatingTable}
          onCreate={routeState.handleCreateTable}
          onOpenChange={routeState.setIsCreateTableOpen}
          open={routeState.isCreateTableOpen}
        />
      )}

      {routeState.renamingTable && (
        <RenameTableDialog
          error={routeState.renameTableError}
          isRenaming={routeState.isRenamingTable}
          onOpenChange={routeState.setIsRenameTableOpen}
          onRename={routeState.handleRenameTable}
          open={routeState.isRenameTableOpen}
          tableName={routeState.renamingTable}
        />
      )}

      {routeState.deletingTable && (
        <DeleteTableDialog
          error={routeState.deleteTableError}
          isDeleting={routeState.isDeletingTable}
          onDelete={routeState.handleDeleteTable}
          onOpenChange={routeState.setIsDeleteTableOpen}
          open={routeState.isDeleteTableOpen}
          tableName={routeState.deletingTable}
        />
      )}
    </>
  );
};