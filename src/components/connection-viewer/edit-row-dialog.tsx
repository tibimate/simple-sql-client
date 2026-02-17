import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface EditRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    autoIncrement: boolean;
    primaryKey: boolean;
  }>;
  row: Record<string, unknown> | null;
  onUpdate: (
    values: Record<string, string>,
    originalRow: Record<string, unknown>
  ) => Promise<void>;
  isUpdating: boolean;
}

type ColumnDefinition = EditRowDialogProps["columns"][number];

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

const isDateType = (columnType: string): boolean => {
  const type = columnType.toLowerCase();
  return (
    type.includes("date") &&
    !type.includes("time") &&
    !type.includes("timestamp")
  );
};

const isDateTimeType = (columnType: string): boolean => {
  const type = columnType.toLowerCase();
  return (
    type.includes("timestamp") ||
    type.includes("datetime") ||
    type.includes("time")
  );
};

const formatDateTimeLocal = (value: unknown): string => {
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 16);
};

const formatDateOnly = (value: unknown): string => {
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
};

const formatValueForInput = (columnType: string, value: unknown): string => {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (isDateTimeType(columnType)) {
    return formatDateTimeLocal(value);
  }
  if (isDateType(columnType)) {
    return formatDateOnly(value);
  }
  return String(value ?? "");
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

interface ColumnFieldProps {
  column: ColumnDefinition;
  value: string;
  isNull: boolean;
  originalValue: string;
  onValueChange: (value: string) => void;
  onNullChange: (value: boolean) => void;
}

const handleNullToggle = (
  checked: boolean,
  originalValue: string,
  onNullChange: (value: boolean) => void,
  onValueChange: (value: string) => void
) => {
  const shouldBeNull = Boolean(checked);
  onNullChange(shouldBeNull);
  onValueChange(shouldBeNull ? "" : originalValue);
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
    <div className="flex items-center gap-2 text-gray-700 text-xs dark:text-zinc-300">
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
  originalValue,
  onValueChange,
  onNullChange,
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
            handleNullToggle(
              checked,
              originalValue,
              onNullChange,
              onValueChange
            )
          }
        />
      )}
      <Select
        disabled={column.autoIncrement || isNull}
        onValueChange={(value) => onValueChange(value)}
        required={!(column.nullable || column.autoIncrement)}
        value={value ?? ""}
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
  originalValue,
  onValueChange,
  onNullChange,
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
            handleNullToggle(
              checked,
              originalValue,
              onNullChange,
              onValueChange
            )
          }
        />
      )}
      <Select
        disabled={column.autoIncrement || isNull}
        onValueChange={(value) => onValueChange(value)}
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
  originalValue,
  onValueChange,
  onNullChange,
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
            handleNullToggle(
              checked,
              originalValue,
              onNullChange,
              onValueChange
            )
          }
        />
      )}
      <Input
        disabled={column.autoIncrement || isNull}
        id={column.name}
        onChange={(event) => onValueChange(event.target.value)}
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
    <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
      <Label htmlFor={column.name}>
        {column.name} {!(column.nullable || column.autoIncrement) && "*"}
        {column.autoIncrement && (
          <span className="ml-2 text-gray-500 text-xs dark:text-zinc-400">
            (auto)
          </span>
        )}
        <span className="ml-2 text-gray-500 text-xs dark:text-zinc-400">
          ({column.type})
        </span>
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

export function EditRowDialog({
  open,
  onOpenChange,
  columns,
  row,
  onUpdate,
  isUpdating,
}: EditRowDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [nullValues, setNullValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open && row) {
      const initialValues: Record<string, string> = {};
      const initialNulls: Record<string, boolean> = {};
      for (const col of columns) {
        const value = row[col.name];
        const isNull = value === null || value === undefined;
        initialNulls[col.name] = isNull;
        initialValues[col.name] = isNull
          ? ""
          : formatValueForInput(col.type, value);
      }
      setValues(initialValues);
      setNullValues(initialNulls);
    }
  }, [open, row, columns]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) {
      return;
    }
    await onUpdate(values, row);
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

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="text-zinc-700 sm:max-w-5xl dark:text-zinc-300">
        <DialogHeader>
          <DialogTitle>Edit Row</DialogTitle>
          <DialogDescription>
            Update the values for this row. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 max-h-[80vh] overflow-y-auto px-4">
          <form className="space-y-4 py-4" onSubmit={handleSubmit}>
            {columns.map((column) => (
              <ColumnField
                column={column}
                isNull={nullValues[column.name] ?? false}
                key={column.name}
                onNullChange={(value) => setColumnNullValue(column.name, value)}
                onValueChange={(value) => setColumnValue(column.name, value)}
                originalValue={
                  row ? formatValueForInput(column.type, row[column.name]) : ""
                }
                value={values[column.name] ?? ""}
              />
            ))}
            <div className="flex justify-end gap-2 border-gray-200 border-t pt-4 dark:border-zinc-700">
              <Button
                disabled={isUpdating}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={isUpdating || !row} type="submit">
                {isUpdating ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
