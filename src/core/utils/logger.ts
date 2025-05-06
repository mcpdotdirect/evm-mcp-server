import { MCPConfigManager } from '../../config/core/mcp-config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const logger = {
  config: MCPConfigManager.getInstance(),

  log(level: LogLevel, message: string, data?: any): void {
    const config = this.config.getConfig();
    const currentLevel = config.logging.level;
    
    // Check if we should log based on level
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const shouldLog = levels.indexOf(level) >= levels.indexOf(currentLevel);
    
    if (!shouldLog) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  },

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  },

  info(message: string, data?: any): void {
    this.log('info', message, data);
  },

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  },

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }
}; 