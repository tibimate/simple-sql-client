import {
  createConnection,
  deleteConnection,
  getAllConnections,
  getConnectionById,
  selectFile,
  updateConnection,
} from "./handlers";

export const connections = {
  create: createConnection,
  getAll: getAllConnections,
  getById: getConnectionById,
  update: updateConnection,
  delete: deleteConnection,
  selectFile,
};
