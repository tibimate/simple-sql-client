import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  stack?: string;
}

class MainProcessLogger {
  private logDir: string;
  private logFile: string;
  private logs: LogEntry[] = [];

  constructor() {
    this.logDir = path.join(app.getPath("userData"), "logs");
    this.logFile = path.join(this.logDir, `app-${new Date().toISOString().split("T")[0]}.log`);

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private writeToFile(entry: LogEntry) {
    try {
      let line = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}`;
      if (entry.data) {
        line += ` - ${JSON.stringify(entry.data)}`;
      }
      if (entry.stack) {
        line += `\n${entry.stack}`;
      }

      fs.appendFileSync(this.logFile, line + "\n", "utf-8");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  private log(level: LogLevel, message: string, data?: unknown, stack?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      stack,
    };

    this.logs.push(entry);

    // Keep only last 100 in memory
    if (this.logs.length > 100) {
      this.logs.shift();
    }

    this.writeToFile(entry);

    // Also log to console
    const prefix = `[${level.toUpperCase()}]`;
    if (level === "error") {
      console.error(prefix, message, data, stack);
    } else if (level === "warn") {
      console.warn(prefix, message, data);
    } else {
      console.log(prefix, message, data);
    }
  }

  info(message: string, data?: unknown) {
    this.log("info", message, data);
  }

  warn(message: string, data?: unknown) {
    this.log("warn", message, data);
  }

  error(message: string, error?: unknown) {
    let data = error;
    let stack: string | undefined;

    if (error instanceof Error) {
      data = error.message;
      stack = error.stack;
    }

    this.log("error", message, data, stack);
  }

  debug(message: string, data?: unknown) {
    this.log("debug", message, data);
  }

  getLogFilePath(): string {
    return this.logFile;
  }
}

export const mainLogger = new MainProcessLogger();
