import { Database, Table } from "lucide-react";

export function NotConnectedState() {
  return (
    <div className="flex h-full items-center justify-center text-gray-500 dark:text-slate-400">
      <div className="text-center">
        <Database className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-slate-600" />
        <p>Connect to database to view tables</p>
      </div>
    </div>
  );
}

export function NoTableSelectedState() {
  return (
    <div className="flex h-full items-center justify-center text-gray-500 dark:text-slate-400">
      <div className="text-center">
        <Table className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-slate-600" />
        <p>Select a table to view its data</p>
      </div>
    </div>
  );
}

export function LoadingState() {
  return <div className="text-gray-500 dark:text-slate-400">Loading...</div>;
}
