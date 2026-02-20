import type { ConnectionType } from "@/ipc/connections/schemas";

export type FilterOperator =
  | "contains"
  | "equals"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "lt"
  | "gte"
  | "lte";

export type TableSchemaColumn = {
  name: string;
  type: string;
  nullable: boolean;
  autoIncrement: boolean;
  primaryKey: boolean;
  foreignKey?: { table: string; column: string } | null;
};

export type SearchFilterMap = {
  [key: string]: {
    value: string;
    operator: FilterOperator;
  };
};

export type ConnectionRouteConfig = {
  connectionType: ConnectionType;
  numericTypes: string[];
  textTypes: string[];
  dateTimeTypes: string[];
  isDateType: (type: string) => boolean;
  quoteIdentifier: (identifier: string) => string;
  supportsDropCascade: boolean;
  panelBackground?: boolean;
  outlineErrorCloseButton?: boolean;
};

export type QueryFilter = {
  column: string;
  value: string;
  operator: FilterOperator;
};