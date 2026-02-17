import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ActiveFiltersProps {
  searchFilters: Record<string, { value: string; operator: string }>;
  onRemoveFilter: (column: string) => void;
  onClearAll: () => void;
}

export function ActiveFilters({
  searchFilters,
  onRemoveFilter,
  onClearAll,
}: ActiveFiltersProps) {
  const hasActiveFilters = Object.entries(searchFilters).some(
    ([_, { value }]) => value.trim() !== ""
  );

  if (!hasActiveFilters) {
    return null;
  }

  return (
    Object.entries(searchFilters).length > 0 && (
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="font-medium text-gray-600 text-xs dark:text-zinc-400">
          Active filters:
        </span>
        {Object.entries(searchFilters).map(([col, { value, operator }]) =>
          value.trim() !== "" ? (
            <Badge
              className="flex items-center gap-1"
              key={col}
              variant="secondary"
            >
              <span className="text-xs">
                {col} {operator} {value}
              </span>
              <button
                className="ml-1 rounded-full p-0.5 hover:bg-gray-300 dark:hover:bg-zinc-700"
                onClick={() => onRemoveFilter(col)}
                type="button"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : null
        )}
        <Button
          className="h-auto px-2 py-1 text-gray-600 text-xs dark:text-zinc-300"
          onClick={onClearAll}
          size="sm"
          variant="ghost"
        >
          Clear all
        </Button>
      </div>
    )
  );
}
