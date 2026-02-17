import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  ConnectionRouteView,
  type ConnectionRouteConfig,
} from "@/components/connection-viewer/connection-route-view";

const sqliteConfig: ConnectionRouteConfig = {
  connectionType: "sqlite",
  numericTypes: ["int", "integer", "real", "float", "double"],
  textTypes: ["text", "char", "varchar", "clob"],
  dateTimeTypes: ["datetime", "date", "time", "timestamp"],
  isDateType: (type: string) => {
    const normalizedType = type.toLowerCase();
    return (
      normalizedType === "date" ||
      (normalizedType.includes("date") && !normalizedType.includes("time"))
    );
  },
  quoteIdentifier: (identifier: string) => `"${identifier.replaceAll('"', '""')}"`,
  supportsDropCascade: true,
  panelBackground: false,
  outlineErrorCloseButton: false,
};

export const Route = createFileRoute("/sqlite/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = useParams({ from: "/sqlite/$id" });
  return <ConnectionRouteView config={sqliteConfig} id={id} />;
}
