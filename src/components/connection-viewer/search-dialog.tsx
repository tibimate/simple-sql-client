import { Loader, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: string[];
  searchFilters: Record<string, { value: string; operator: string }>;
  onFilterChange: (column: string, value: string, operator: string) => void;
  onRemoveFilter: (column: string) => void;
  onSearch: () => void;
  onClear: () => void;
  isSearching: boolean;
  selectedTable: string | null;
  getOperatorsForColumn: (
    columnName: string
  ) => Array<{ value: string; label: string }>;
  getInputTypeForColumn: (
    columnName: string
  ) => "text" | "date" | "datetime-local";
}

export function SearchDialog({
  open,
  onOpenChange,
  columns,
  searchFilters,
  onFilterChange,
  onRemoveFilter,
  onSearch,
  onClear,
  isSearching,
  selectedTable,
  getOperatorsForColumn,
  getInputTypeForColumn,
}: SearchDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Search className="h-4 w-4" />
          <span className="leading-none">Search</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="text-zinc-700 sm:max-w-2xl dark:text-zinc-300">
        <DialogHeader>
          <DialogTitle>Search {selectedTable}</DialogTitle>
          <DialogDescription>
            Add filters to search the table data
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 max-h-[70vh] overflow-y-auto px-4">
          <div className="space-y-4 py-4">
            {columns.map((col) => (
              <div className="flex items-end gap-2" key={col}>
                <div className="flex-1">
                  <label
                    className="font-medium text-sm"
                    htmlFor={`filter-${col}`}
                  >
                    {col}
                  </label>
                  <Select
                    onValueChange={(value) => {
                      onFilterChange(
                        col,
                        searchFilters[col]?.value || "",
                        value
                      );
                    }}
                    value={
                      searchFilters[col]?.operator ||
                      getOperatorsForColumn(col)[0]?.value ||
                      "contains"
                    }
                  >
                    <SelectTrigger className="w-full max-w-48">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperatorsForColumn(col).map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Input
                    className="text-sm"
                    onChange={(e) => {
                      onFilterChange(
                        col,
                        e.target.value,
                        searchFilters[col]?.operator ||
                          getOperatorsForColumn(col)[0]?.value ||
                          "contains"
                      );
                    }}
                    placeholder={`Search ${col}...`}
                    type={getInputTypeForColumn(col)}
                    value={searchFilters[col]?.value || ""}
                  />
                </div>
                <Button
                  onClick={() => onRemoveFilter(col)}
                  size="sm"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-gray-200 border-t pt-4 dark:border-slate-700">
          <Button
            disabled={Object.keys(searchFilters).length === 0}
            onClick={onClear}
            variant="outline"
          >
            <span className="leading-none">Clear</span>
          </Button>
          <Button
            disabled={Object.values(searchFilters).every((f) => !f.value)}
            onClick={onSearch}
          >
            {isSearching ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
