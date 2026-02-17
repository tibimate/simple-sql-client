import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface RenameTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  onRename: (newName: string) => Promise<void>;
  isRenaming: boolean;
  error?: string | null;
}

export function RenameTableDialog({
  open,
  onOpenChange,
  tableName,
  onRename,
  isRenaming,
  error,
}: RenameTableDialogProps) {
  const [newName, setNewName] = useState(tableName);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reset input when dialog opens or when tableName changes
  useEffect(() => {
    if (open) {
      setNewName(tableName);
      setLocalError(null);
    }
  }, [open, tableName]);

  const trimmedNewName = newName.trim();
  const nameError =
    trimmedNewName && !TABLE_NAME_PATTERN.test(trimmedNewName)
      ? "Table names must start with a letter or underscore and use only letters, numbers, and underscores."
      : null;

  const isNameChanged = trimmedNewName !== tableName;
  const isValid = isNameChanged && !nameError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!isValid) {
      return;
    }

    try {
      await onRename(trimmedNewName);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLocalError(message);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="text-zinc-700 sm:max-w-md dark:text-zinc-300">
        <DialogHeader>
          <DialogTitle>Rename Table</DialogTitle>
          <DialogDescription>
            Enter the new name for table "{tableName}".
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4 py-4" onSubmit={handleSubmit}>
          {(error || localError || nameError) && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
              {localError ?? nameError ?? error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="new-table-name">New table name</Label>
            <Input
              autoFocus
              id="new-table-name"
              onChange={(e) => setNewName(e.target.value)}
              placeholder="new_table_name"
              value={newName}
            />
            <p className="text-muted-foreground text-xs">
              Use letters, numbers, and underscores only. No spaces.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={isRenaming}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isRenaming || !isValid} type="submit">
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
