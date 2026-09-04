/**
 * Logger.ts
 * Section 23 of README specification:
 * Multi-level logging (INFO, DEBUG, ERROR, ACTION, DELAY).
 * Outputs formatted messages to console.info / console.warn / console.error
 * and pushes log events into the active SurveySession for UI streaming.
 */
import { LogEntry } from '../../../src/types.js';

export class Logger {
  public static log(
    logsArray: LogEntry[],
    level: LogEntry['level'],
    message: string,
    details?: any,
    onLogAdded?: (entry: LogEntry) => void
  ): LogEntry {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      level,
      message,
      details,
    };

    logsArray.push(entry);
    if (logsArray.length > 250) {
      logsArray.shift();
    }

    // Terminal console output
    const timeStr = new Date().toLocaleTimeString();
    switch (level) {
      case 'error':
        console.error(`[${timeStr}] [ERROR] ${message}`, details || '');
        break;
      case 'warn':
        console.warn(`[${timeStr}] [WARN] ${message}`, details || '');
        break;
      case 'success':
        console.info(`[${timeStr}] [SUCCESS] \x1b[32m${message}\x1b[0m`, details || '');
        break;
      case 'action':
        console.info(`[${timeStr}] [ACTION] \x1b[36m${message}\x1b[0m`, details || '');
        break;
      case 'info':
      default:
        console.info(`[${timeStr}] [INFO] ${message}`, details || '');
        break;
    }

    if (onLogAdded) {
      onLogAdded(entry);
    }

    return entry;
  }
}
