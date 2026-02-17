import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  ConnectionRouteView,
  type ConnectionRouteConfig,
} from "@/components/connection-viewer/connection-route-view";

const mysqlConfig: ConnectionRouteConfig = {
  connectionType: "mysql",
  numericTypes: [
    "int",
    "bigint",
    "smallint",
    "numeric",
    "decimal",
    "real",
    "double",
    "float",
    "tinyint",
    "mediumint",
  ],
  textTypes: [
    "char",
    "text",
    "varchar",
    "string",
    "longtext",
    "mediumtext",
    "tinytext",
  ],
  dateTimeTypes: ["timestamp", "date", "time", "datetime", "year"],
  isDateType: (type: string) => {
    const normalizedType = type.toLowerCase();
    return (
      normalizedType.includes("date") && !normalizedType.includes("time")
    );
  },
  quoteIdentifier: (identifier: string) => `\`${identifier.replaceAll("`", "``")}\``,
  supportsDropCascade: true,
  panelBackground: true,
  outlineErrorCloseButton: true,
};

export const Route = createFileRoute("/mysql/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = useParams({ from: "/mysql/$id" });
  return <ConnectionRouteView config={mysqlConfig} id={id} />;
}
