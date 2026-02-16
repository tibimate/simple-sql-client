import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface DeleteTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  onDelete: (ignoreForeignKeys: boolean) => Promise<void>;
  isDeleting: boolean;
  error?: string | null;
}

export function DeleteTableDialog({
  open,
  onOpenChange,
  tableName,
  onDelete,
  isDeleting,
  error,
}: DeleteTableDialogProps) {
  const [ignoreForeignKeys, setIgnoreForeignKeys] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setIgnoreForeignKeys(false);
      setLocalError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleDelete = async () => {
    setLocalError(null);
    try {
      await onDelete(ignoreForeignKeys);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLocalError(message);
    }
  };

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <AlertDialogContent className="text-zinc-700 dark:text-zinc-300">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Table</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the table "{tableName}"? This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {(error || localError) && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
            {localError ?? error}
          </div>
        )}

        <div className="flex items-center gap-3 py-4">
          <Checkbox
            checked={ignoreForeignKeys}
            disabled={isDeleting}
            id="ignore-fk"
            onCheckedChange={(checked) =>
              setIgnoreForeignKeys(Boolean(checked))
            }
          />
          <label
            className="cursor-pointer font-medium text-sm"
            htmlFor="ignore-fk"
          >
            Ignore foreign keys (DROP TABLE CASCADE)
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={handleDelete}
            variant="destructive"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
