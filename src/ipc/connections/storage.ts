import fs from "node:fs";
import path from "node:path";
import { app, safeStorage } from "electron";
import type { Connection } from "./schemas";

interface StoredConnection extends Omit<Connection, "password"> {
  password?: string;
  encryptedPassword?: string;
}

class ConnectionStorage {
  private readonly filePath: string;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.filePath = path.join(userDataPath, "connections.json");
  }

  private encryptPassword(password: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn("Encryption not available, storing password as base64");
      return Buffer.from(password).toString("base64");
    }
    const encrypted = safeStorage.encryptString(password);
    return encrypted.toString("base64");
  }

  private decryptPassword(encryptedPassword: string): string {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn("Encryption not available, decoding from base64");
      return Buffer.from(encryptedPassword, "base64").toString();
    }
    const buffer = Buffer.from(encryptedPassword, "base64");
    return safeStorage.decryptString(buffer);
  }

  private ensureFileExists(): void {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]), "utf-8");
    }
  }

  private readConnections(): StoredConnection[] {
    this.ensureFileExists();
    const data = fs.readFileSync(this.filePath, "utf-8");
    return JSON.parse(data);
  }

  private writeConnections(connections: StoredConnection[]): void {
    fs.writeFileSync(
      this.filePath,
      JSON.stringify(connections, null, 2),
      "utf-8"
    );
  }

  getAllConnections(): Connection[] {
    const connections = this.readConnections();
    return connections.map((conn) => {
      if (conn.encryptedPassword) {
        return {
          ...conn,
          password: this.decryptPassword(conn.encryptedPassword),
        } as Connection;
      }
      return conn as Connection;
    });
  }

  getConnectionById(id: string): Connection | null {
    const connections = this.getAllConnections();
    return connections.find((conn) => conn.id === id) || null;
  }

  addConnection(connection: Connection): Connection {
    const connections = this.readConnections();

    const storedConnection: StoredConnection = { ...connection };

    if ("password" in connection && connection.password) {
      storedConnection.encryptedPassword = this.encryptPassword(
        connection.password
      );
      storedConnection.password = undefined;
    }

    connections.push(storedConnection);
    this.writeConnections(connections);

    return connection;
  }

  updateConnection(
    id: string,
    updates: Partial<Connection>
  ): Connection | null {
    const connections = this.readConnections();
    const index = connections.findIndex((conn) => conn.id === id);

    if (index === -1) {
      return null;
    }

    const existingConnection = connections[index];
    const updatedConnection: StoredConnection = {
      ...existingConnection,
      ...updates,
    };

    if ("password" in updates && updates.password) {
      updatedConnection.encryptedPassword = this.encryptPassword(
        updates.password
      );
      updatedConnection.password = undefined;
    }

    connections[index] = updatedConnection;
    this.writeConnections(connections);

    return this.getConnectionById(id);
  }

  deleteConnection(id: string): boolean {
    const connections = this.readConnections();
    const filteredConnections = connections.filter((conn) => conn.id !== id);

    if (filteredConnections.length === connections.length) {
      return false;
    }

    this.writeConnections(filteredConnections);
    return true;
  }
}

export const connectionStorage = new ConnectionStorage();
