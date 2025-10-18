// Simple structured logger

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private prefix: string;

  constructor(prefix: string = 'paperbrain') {
    this.prefix = prefix;
  }

  private log(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level.toUpperCase()}] [${this.prefix}] ${message}`;
    
    if (level === 'error') {
      console.error(logLine, meta || '');
    } else if (level === 'warn') {
      console.warn(logLine, meta || '');
    } else {
      console.log(logLine, meta || '');
    }
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: any) {
    this.log('error', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log('debug', message, meta);
  }

  child(subPrefix: string): Logger {
    return new Logger(`${this.prefix}:${subPrefix}`);
  }
}

export const logger = new Logger();
export { Logger };

