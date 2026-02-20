import {
  ConnectionHeader,
  LoadingState,
  NoTableSelectedState,
  NotConnectedState,
  TableSidebar,
} from "@/components/connection-viewer";
import { ConnectionRouteDialogs } from "@/components/connection-viewer/connection-route-dialogs";
import { ConnectionRouteTableContent } from "@/components/connection-viewer/connection-route-table-content";
import type { ConnectionRouteConfig } from "@/components/connection-viewer/connection-route-types";
import { useConnectionRouteState } from "@/components/connection-viewer/use-connection-route-state";

export type { ConnectionRouteConfig };

type ConnectionRouteViewProps = {
  id: string;
  config: ConnectionRouteConfig;
};

export const ConnectionRouteView = ({ id, config }: ConnectionRouteViewProps) => {
  const routeState = useConnectionRouteState({ config, id });

  if (routeState.error && !routeState.connection) {
    return <div className="p-6 text-red-600">{routeState.error}</div>;
  }

  if (!routeState.connection) {
    return <div className="p-6 text-red-600">Connection not found</div>;
  }

  return (
    <div className="flex w-full flex-col">
      <ConnectionHeader
        connection={routeState.connection}
        isConnected={routeState.isConnected}
        isConnecting={routeState.isConnecting}
        isLoading={routeState.isLoading}
        onConnect={routeState.connectToDatabase}
        onDisconnect={routeState.handleDisconnect}
        onRefreshTables={routeState.loadTables}
      />

      <div className="h-screen pt-17 pb-8">
        <div className="flex h-full">
          <TableSidebar
            isConnected={routeState.isConnected}
            onAddTable={routeState.handleAddTable}
            onDeleteTable={routeState.handleDeleteTableOpen}
            onRenameTable={routeState.handleRenameTableOpen}
            onSelectTable={routeState.loadTableData}
            selectedTable={routeState.selectedTable}
            tables={routeState.tables}
          />

          <div className="h-full min-w-0 flex-1 overflow-auto">
            {routeState.isConnected ? (
              routeState.selectedTable ? (
                routeState.tableData ? (
                  <ConnectionRouteTableContent config={config} routeState={routeState} />
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
      <ConnectionRouteDialogs routeState={routeState} />
    </div>
  );
};
