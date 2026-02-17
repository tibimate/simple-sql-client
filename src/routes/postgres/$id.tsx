import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  ConnectionRouteView,
  type ConnectionRouteConfig,
} from "@/components/connection-viewer/connection-route-view";

const postgresConfig: ConnectionRouteConfig = {
  connectionType: "postgres",
  numericTypes: [
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
  ],
  textTypes: ["character", "text", "varchar", "string", "char"],
  dateTimeTypes: [
    "timestamp",
    "date",
    "time",
    "datetime",
    "timestamptz",
    "timestamp with time zone",
    "timestamp without time zone",
  ],
  isDateType: (type: string) => {
    const normalizedType = type.toLowerCase();
    return (
      normalizedType.includes("date") &&
      !normalizedType.includes("timestamp")
    );
  },
  quoteIdentifier: (identifier: string) => `"${identifier.replaceAll('"', '""')}"`,
  supportsDropCascade: true,
  panelBackground: true,
  outlineErrorCloseButton: true,
};

export const Route = createFileRoute("/postgres/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = useParams({ from: "/postgres/$id" });
  return <ConnectionRouteView config={postgresConfig} id={id} />;
}
