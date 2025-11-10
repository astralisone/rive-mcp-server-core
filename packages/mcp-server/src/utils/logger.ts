/**
 * Logger utility for MCP Server
 * Logs to file by default (./logs/logs.log) or stderr if file logging fails
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private level: LogLevel;
  private enableTimestamp: boolean;
  private logFilePath: string | null;
  private logStream: fs.WriteStream | null = null;

  constructor(level: LogLevel = 'info', enableTimestamp: boolean = true, logFilePath?: string) {
    this.level = level;
    this.enableTimestamp = enableTimestamp;

    // Default to ./logs/logs.log, can be overridden by LOG_FILE env var
    this.logFilePath = logFilePath || process.env.LOG_FILE || path.join(process.cwd(), 'logs', 'logs.log');

    this.initializeLogFile();
  }

  private initializeLogFile(): void {
    if (!this.logFilePath) return;

    try {
      // Ensure logs directory exists
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Create write stream (append mode)
      this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });

      // Log initialization
      this.writeLog('info', `Logger initialized, writing to ${this.logFilePath}`);
    } catch (error) {
      console.error(`[LOGGER] Failed to initialize log file ${this.logFilePath}:`, error);
      this.logStream = null;
    }
  }

  private writeLog(level: LogLevel, message: string): void {
    if (this.logStream && !this.logStream.destroyed) {
      this.logStream.write(message + '\n');
    } else {
      // Fallback to stderr if file logging unavailable
      console.error(message);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.enableTimestamp ? `[${new Date().toISOString()}]` : '';
    const levelStr = `[${level.toUpperCase()}]`;
    const baseMessage = `${timestamp} ${levelStr} ${message}`;

    if (data !== undefined) {
      return `${baseMessage} ${JSON.stringify(data, null, 2)}`;
    }

    return baseMessage;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.writeLog('debug', this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.writeLog('info', this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      this.writeLog('warn', this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog('error')) {
      this.writeLog('error', this.formatMessage('error', message, data));
    }
  }

  close(): void {
    if (this.logStream && !this.logStream.destroyed) {
      this.logStream.end();
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }
}

// Get log level from environment variable or default to 'info'
const logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

// Export singleton logger instance
export const logger = new Logger(logLevel, true);

// Export Logger class for testing
export { Logger };
