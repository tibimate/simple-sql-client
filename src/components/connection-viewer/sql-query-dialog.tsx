import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface SqlQueryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecute: (query: string) => Promise<void>;
  isExecuting: boolean;
  error?: string | null;
  onClearError?: () => void;
  initialQuery?: string;
  query?: string;
  onQueryChange?: (query: string) => void;
}

export function SqlQueryDialog({
  open,
  onOpenChange,
  onExecute,
  isExecuting,
  error,
  onClearError,
  initialQuery,
  query,
  onQueryChange,
}: SqlQueryDialogProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const effectiveQuery = query ?? internalQuery;

  useEffect(() => {
    if (!open || query !== undefined) {
      return;
    }

    if (initialQuery !== undefined) {
      setInternalQuery(initialQuery);
    }
  }, [initialQuery, open, query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (effectiveQuery.trim()) {
      onClearError?.();
      await onExecute(effectiveQuery);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[80vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="dark:text-zinc-300">Execute SQL Query</DialogTitle>
          <DialogDescription>
            Write and execute custom SQL queries. Results will be displayed in
            the table view.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 max-h-[50vh] overflow-y-auto px-4">
          <form className="space-y-4 py-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              {error ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-red-800 text-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </div>
              ) : null}
              <Textarea
                className="min-h-[200px] font-mono text-sm"
                onChange={(e) => {
                  if (error) {
                    onClearError?.();
                  }
                  const nextValue = e.target.value;
                  if (query !== undefined) {
                    onQueryChange?.(nextValue);
                    return;
                  }
                  setInternalQuery(nextValue);
                }}
                placeholder="SELECT * FROM table_name WHERE ..."
                required
                value={effectiveQuery}
              />
            </div>
            <div className="flex justify-end gap-2 border-gray-200 border-t pt-4 dark:border-slate-700">
              <Button
                disabled={isExecuting}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
                className="text-primary"
              >
                Cancel
              </Button>
              <Button
                disabled={isExecuting || !effectiveQuery.trim()}
                type="submit"
              >
                {isExecuting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  "Execute Query"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
