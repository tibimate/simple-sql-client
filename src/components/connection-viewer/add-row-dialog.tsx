import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "../ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface AddRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    autoIncrement: boolean;
    primaryKey: boolean;
  }>;
  onAdd: (values: Record<string, string>) => Promise<void>;
  isAdding: boolean;
}

type ColumnDefinition = AddRowDialogProps["columns"][number];

type NullToggleHandlers = {
  onNullChange: (value: boolean) => void;
  onValueChange: (value: string) => void;
  onLastNonNullChange: (value: string) => void;
};

interface ColumnFieldProps {
  column: ColumnDefinition;
  value: string;
  isNull: boolean;
  lastNonNullValue: string;
  onValueChange: (value: string) => void;
  onNullChange: (value: boolean) => void;
  onLastNonNullChange: (value: string) => void;
}

const ENUM_REGEX = /enum\((.*)\)/i;

const getInputType = (columnType: string): string => {
  const type = columnType.toLowerCase();
  if (
    type.includes("int") ||
    type.includes("numeric") ||
    type.includes("decimal") ||
    type.includes("float") ||
    type.includes("real") ||
    type.includes("double")
  ) {
    return "number";
  }
  if (type.includes("date") && !type.includes("timestamp")) {
    return "date";
  }
  if (type.includes("timestamp") || type.includes("datetime")) {
    return "datetime-local";
  }
  if (type.includes("time") && !type.includes("timestamp")) {
    return "time";
  }
  return "text";
};

const isBooleanType = (columnType: string): boolean => {
  const type = columnType.toLowerCase();
  return type.includes("bool") || type === "boolean";
};

const isEnumType = (columnType: string): boolean => {
  return columnType.toLowerCase().includes("enum(");
};

const getEnumValues = (columnType: string): string[] => {
  const match = columnType.match(ENUM_REGEX);
  if (!match) {
    return [];
  }
  return match[1]
    .split(",")
    .map((value) => value.trim().replace(/^['"]|['"]$/g, ""))
    .filter((value) => value.length > 0);
};

const getInputPlaceholder = (column: ColumnDefinition): string => {
  if (column.autoIncrement) {
    return "Auto increment";
  }
  if (column.nullable) {
    return "NULL (optional)";
  }
  return "Required";
};

const handleNullToggle = (
  checked: boolean,
  currentValue: string,
  lastNonNullValue: string,
  handlers: NullToggleHandlers
) => {
  const shouldBeNull = Boolean(checked);
  handlers.onNullChange(shouldBeNull);
  if (shouldBeNull) {
    handlers.onLastNonNullChange(currentValue ?? "");
    handlers.onValueChange("");
    return;
  }
  handlers.onValueChange(lastNonNullValue ?? "");
};

const handleValueChange = (
  nextValue: string,
  onValueChange: (value: string) => void,
  onLastNonNullChange: (value: string) => void
) => {
  onValueChange(nextValue);
  onLastNonNullChange(nextValue);
};

function NullToggle({
  id,
  checked,
  onToggle,
}: {
  id: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-gray-700 text-xs">
      <Checkbox
        checked={checked}
        id={id}
        onCheckedChange={(nextValue) => onToggle(Boolean(nextValue))}
      />
      <Label htmlFor={id}>NULL</Label>
    </div>
  );
}

function BooleanField({
  column,
  value,
  isNull,
  lastNonNullValue,
  onValueChange,
  onNullChange,
  onLastNonNullChange,
}: ColumnFieldProps) {
  const nullId = `${column.name}-null`;
  const showNullToggle = column.nullable && !column.autoIncrement;

  return (
    <>
      {showNullToggle && (
        <NullToggle
          checked={isNull}
          id={nullId}
          onToggle={(checked) =>
            handleNullToggle(checked, value, lastNonNullValue, {
              onNullChange,
              onValueChange,
              onLastNonNullChange,
            })
          }
        />
      )}
      <Select
        disabled={column.autoIncrement || isNull}
        onValueChange={(value) =>
          handleValueChange(
            value,
            onValueChange,
            onLastNonNullChange
          )
        }
        required={!(column.nullable || column.autoIncrement)}
        value={value}
      >
        <SelectTrigger className="w-full max-w-48">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">True</SelectItem>
          <SelectItem value="false">False</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}

function EnumField({
  column,
  value,
  isNull,
  lastNonNullValue,
  onValueChange,
  onNullChange,
  onLastNonNullChange,
}: ColumnFieldProps) {
  const nullId = `${column.name}-null`;
  const showNullToggle = column.nullable && !column.autoIncrement;

  return (
    <>
      {showNullToggle && (
        <NullToggle
          checked={isNull}
          id={nullId}
          onToggle={(checked) =>
            handleNullToggle(checked, value, lastNonNullValue, {
              onNullChange,
              onValueChange,
              onLastNonNullChange,
            })
          }
        />
      )}
      <Select
        disabled={column.autoIncrement || isNull}
        onValueChange={(value) =>
          handleValueChange(
            value,
            onValueChange,
            onLastNonNullChange
          )
        }
        required={!(column.nullable || column.autoIncrement)}
        value={value ?? ""}
      >
        <SelectTrigger className="w-full max-w-48">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
        {getEnumValues(column.type).map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
        </SelectContent>
      </Select>
    </>
  );
}

function TextField({
  column,
  value,
  isNull,
  lastNonNullValue,
  onValueChange,
  onNullChange,
  onLastNonNullChange,
}: ColumnFieldProps) {
  const nullId = `${column.name}-null`;
  const showNullToggle = column.nullable && !column.autoIncrement;

  return (
    <>
      {showNullToggle && (
        <NullToggle
          checked={isNull}
          id={nullId}
          onToggle={(checked) =>
            handleNullToggle(checked, value, lastNonNullValue, {
              onNullChange,
              onValueChange,
              onLastNonNullChange,
            })
          }
        />
      )}
      <Input
        disabled={column.autoIncrement || isNull}
        id={column.name}
        onChange={(event) =>
          handleValueChange(
            event.target.value,
            onValueChange,
            onLastNonNullChange
          )
        }
        placeholder={getInputPlaceholder(column)}
        required={!(column.nullable || column.autoIncrement)}
        type={getInputType(column.type)}
        value={value ?? ""}
      />
    </>
  );
}

function ColumnField(props: ColumnFieldProps) {
  const { column } = props;

  return (
    <div className="space-y-2">
      <Label htmlFor={column.name}>
        {column.name} {!(column.nullable || column.autoIncrement) && "*"}
        {column.autoIncrement && (
          <span className="ml-2 text-gray-500 text-xs">(auto)</span>
        )}
        <span className="ml-2 text-gray-500 text-xs">({column.type})</span>
      </Label>
      {isBooleanType(column.type) && <BooleanField {...props} />}
      {!isBooleanType(column.type) && isEnumType(column.type) && (
        <EnumField {...props} />
      )}
      {!(isBooleanType(column.type) || isEnumType(column.type)) && (
        <TextField {...props} />
      )}
    </div>
  );
}

export function AddRowDialog({
  open,
  onOpenChange,
  columns,
  onAdd,
  isAdding,
}: AddRowDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [nullValues, setNullValues] = useState<Record<string, boolean>>({});
  const [lastNonNullValues, setLastNonNullValues] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (open) {
      const initialValues: Record<string, string> = {};
      const initialNulls: Record<string, boolean> = {};
      const initialLastNonNulls: Record<string, string> = {};
      for (const col of columns) {
        if (isBooleanType(col.type) && !col.nullable && !col.autoIncrement) {
          initialValues[col.name] = "false";
        } else if (
          isEnumType(col.type) &&
          !col.nullable &&
          !col.autoIncrement
        ) {
          const options = getEnumValues(col.type);
          initialValues[col.name] = options[0] ?? "";
        } else {
          initialValues[col.name] = "";
        }
        initialNulls[col.name] = false;
        initialLastNonNulls[col.name] = initialValues[col.name];
      }
      setValues(initialValues);
      setNullValues(initialNulls);
      setLastNonNullValues(initialLastNonNulls);
    }
  }, [open, columns]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const filteredValues: Record<string, string> = {};
    for (const col of columns) {
      const value = values[col.name];
      if (col.autoIncrement && (!value || value.trim() === "")) {
        continue;
      }
      filteredValues[col.name] = value;
    }
    await onAdd(filteredValues);
  };

  const setColumnValue = (name: string, value: string) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const setColumnNullValue = (name: string, value: boolean) => {
    setNullValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const setColumnLastNonNullValue = (name: string, value: string) => {
    setLastNonNullValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-5xl text-zinc-700 dark:text-zinc-300">
        <DialogHeader>
          <DialogTitle>Add New Row</DialogTitle>
          <DialogDescription>
            Fill in the values for the new row. Fields marked with * are
            required.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="-mx-4 max-h-[80vh] overflow-y-auto px-4">
          <form className="space-y-4 py-4" onSubmit={handleSubmit}>
            {columns.map((column) => (
              <ColumnField
                column={column}
                isNull={nullValues[column.name] ?? false}
                key={column.name}
                lastNonNullValue={lastNonNullValues[column.name] ?? ""}
                onLastNonNullChange={(value) =>
                  setColumnLastNonNullValue(column.name, value)
                }
                onNullChange={(value) => setColumnNullValue(column.name, value)}
                onValueChange={(value) => setColumnValue(column.name, value)}
                value={values[column.name] ?? ""}
              />
            ))}
            <DialogFooter className="flex justify-end gap-2 dark:border-zinc-700 border-gray-200 border-t pt-4">
              <Button
                disabled={isAdding}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isAdding} type="submit">
                {isAdding ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Row"
                )}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
