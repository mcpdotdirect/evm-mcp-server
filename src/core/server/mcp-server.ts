import { AutoRecognitionService } from '../services/auto-recognition.js';
import { logger } from '../utils/logger.js';

export class MCPServer {
  private static instance: MCPServer;
  private autoRecognition: AutoRecognitionService;

  private constructor() {
    this.autoRecognition = AutoRecognitionService.getInstance();
  }

  public static getInstance(): MCPServer {
    if (!MCPServer.instance) {
      MCPServer.instance = new MCPServer();
    }
    return MCPServer.instance;
  }

  public async handleRequest(request: {
    text: string;
    type?: 'cursor' | 'command';
  }): Promise<{
    handled: boolean;
    response?: any;
  }> {
    const { text, type } = request;

    // If type is explicitly provided, use it
    if (type) {
      const shouldHandle = type === 'cursor' 
        ? this.autoRecognition.shouldHandleCursorInteraction(text)
        : this.autoRecognition.shouldHandleCommand(text);

      if (!shouldHandle) {
        return { handled: false };
      }

      return this.processRequest(text, type);
    }

    // Otherwise, use auto-recognition
    const analysis = this.autoRecognition.analyzeText(text);
    
    if (!analysis.shouldHandle) {
      return { handled: false };
    }

    return this.processRequest(text, analysis.type);
  }

  private async processRequest(
    text: string,
    type: 'cursor' | 'command'
  ): Promise<{
    handled: boolean;
    response?: any;
  }> {
    try {
      if (type === 'cursor' && this.autoRecognition.isFeatureEnabled('cursorIntegration')) {
        // Handle Cursor-specific operations
        return {
          handled: true,
          response: await this.handleCursorOperation(text)
        };
      } else if (type === 'command' && this.autoRecognition.isFeatureEnabled('commandExecution')) {
        // Handle command execution
        return {
          handled: true,
          response: await this.handleCommand(text)
        };
      }

      return { handled: false };
    } catch (error) {
      logger.error('Error processing request:', error);
      return {
        handled: true,
        response: {
          error: 'Failed to process request',
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  private async handleCursorOperation(text: string): Promise<any> {
    // Implement Cursor-specific operations
    // This could include file operations, project management, etc.
    return {
      type: 'cursor',
      operation: 'processed',
      text
    };
  }

  private async handleCommand(text: string): Promise<any> {
    // Implement command execution logic
    return {
      type: 'command',
      operation: 'executed',
      text
    };
  }
} 