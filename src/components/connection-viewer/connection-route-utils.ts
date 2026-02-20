import type {
  ConnectionRouteConfig,
  FilterOperator,
  QueryFilter,
  SearchFilterMap,
} from "@/components/connection-viewer/connection-route-types";

const ALL_OPERATORS: Array<{ value: FilterOperator; label: string }> = [
  { value: "contains", label: "Contains" },
  { value: "equals", label: "Equals" },
  { value: "startsWith", label: "Starts with" },
  { value: "endsWith", label: "Ends with" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lte", label: "Less or equal" },
];

export const mapActiveFilters = (searchFilters: SearchFilterMap): QueryFilter[] => {
  return Object.entries(searchFilters)
    .filter(([_, { value }]) => value.trim() !== "")
    .map(([column, { value, operator }]) => ({
      column,
      value,
      operator,
    }));
};

export const hasActiveFilters = (searchFilters: SearchFilterMap): boolean => {
  return Object.values(searchFilters).some((filter) => filter.value.trim() !== "");
};

const includesAny = (type: string, candidates: string[]): boolean => {
  const normalizedType = type.toLowerCase();
  return candidates.some((candidate) => normalizedType.includes(candidate));
};

export const getOperatorsForColumnType = (
  type: string,
  config: ConnectionRouteConfig
): Array<{ value: FilterOperator; label: string }> => {
  if (includesAny(type, config.numericTypes) || includesAny(type, config.dateTimeTypes)) {
    return ALL_OPERATORS.filter((operatorOption) =>
      ["equals", "gt", "lt", "gte", "lte"].includes(operatorOption.value)
    );
  }

  if (includesAny(type, config.textTypes)) {
    return ALL_OPERATORS;
  }

  return ALL_OPERATORS;
};

export const getInputTypeForColumnType = (
  type: string,
  config: ConnectionRouteConfig
): "text" | "date" | "datetime-local" => {
  if (config.isDateType(type)) {
    return "date";
  }

  if (includesAny(type, config.dateTimeTypes)) {
    return "datetime-local";
  }

  return "text";
};