import {
  EllipsisVerticalIcon,
  Pencil,
  PlusIcon,
  Table,
  Trash,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface TableSidebarProps {
  tables: string[];
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
  isConnected: boolean;
  onAddTable: () => void;
  onRenameTable: (tableName: string) => void;
  onDeleteTable: (tableName: string) => void;
}

export function TableSidebar({
  tables,
  selectedTable,
  onSelectTable,
  isConnected,
  onAddTable,
  onRenameTable,
  onDeleteTable,
}: TableSidebarProps) {
  return (
    <div className="flex h-full dark:bg-zinc-900 w-64 flex-col border-r border-zinc-200 dark:border-zinc-800">
      <ScrollArea className="flex-1 overflow-y-auto">
        {isConnected && (
          <div>
            <div>
              {tables.map((table) => (
                <div className="relative" key={table}>
                  <button
                    className={`flex w-full items-center justify-between truncate px-3 py-2 text-left text-sm  ${
                      selectedTable === table
                        ? "border-blue-300 border-l-2 bg-gray-100 font-medium text-primary dark:border-blue-500 dark:bg-zinc-700"
                        : "hover:bg-gray-100 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    }`}
                    onClick={() => onSelectTable(table)}
                    type="button"
                  >
                    <span className="flex items-center dark:text-primary">
                      <Table className="mr-2 inline h-3 w-3" />
                      {table}
                    </span>
                  </button>
                  <div className="absolute top-1/2 right-1 -translate-y-1/2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          onClick={(e) => e.stopPropagation()}
                          size="icon"
                          variant="ghost"
                          className="dark:text-zinc-400"
                        >
                          <EllipsisVerticalIcon className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => onRenameTable(table)}>
                          <Pencil className="inline h-3 w-3" />
                          <span className="leading-none">Rename table</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onDeleteTable(table)}>
                          <Trash className="inline h-3 w-3" />
                          <span className="leading-none">Delete table</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
      <div className="flex items-center justify-center border-zinc-200 border-t px-2 py-2 dark:border-zinc-700">
        <Button
          className="flex items-center gap-2"
          disabled={!isConnected}
          onClick={onAddTable}
          size="sm"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="leading-none">Add Table</span>
        </Button>
      </div>
    </div>
  );
}
