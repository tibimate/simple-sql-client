export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  log(level: LogLevel, message: string, data?: unknown, stack?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      stack,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

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

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getFormattedLogs(): string {
    return this.logs
      .map((entry) => {
        let line = `${entry.timestamp} [${entry.level.toUpperCase()}] ${entry.message}`;
        if (entry.data) {
          line += ` - ${JSON.stringify(entry.data)}`;
        }
        if (entry.stack) {
          line += `\n${entry.stack}`;
        }
        return line;
      })
      .join("\n");
  }
}

export const logger = new Logger();
