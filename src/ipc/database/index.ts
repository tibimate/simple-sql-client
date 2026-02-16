import {
  connectDatabase,
  deleteRows,
  disconnectDatabase,
  executeQuery,
  getForeignKeyRows,
  getTableData,
  getTableSchema,
  insertRow,
  isConnected,
  listTables,
  updateRow,
} from "./handlers";

export const database = {
  connect: connectDatabase,
  disconnect: disconnectDatabase,
  isConnected,
  listTables,
  executeQuery,
  getTableSchema,
  getTableData,
  getForeignKeyRows,
  insertRow,
  deleteRows,
  updateRow,
};
