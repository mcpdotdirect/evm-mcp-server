import { z } from 'zod';

// Define pattern type
interface Pattern {
  type: 'cursor' | 'command';
  pattern: string;
  description: string;
}

// Define the configuration schema
export const MCPConfigSchema = z.object({
  autoRecognition: z.object({
    enabled: z.boolean().default(true),
    patterns: z.array(z.object({
      type: z.enum(['cursor', 'command']),
      pattern: z.string(),
      description: z.string()
    })).default([
      {
        type: 'cursor' as const,
        pattern: 'cursor|ide|editor|code|file|project|workspace',
        description: 'Patterns related to Cursor IDE interactions'
      },
      {
        type: 'command' as const,
        pattern: 'run|execute|command|cli|terminal|shell|npm|bun|yarn',
        description: 'Patterns related to command execution'
      }
    ]),
    confidenceThreshold: z.number().min(0).max(1).default(0.7)
  }),
  features: z.object({
    cursorIntegration: z.boolean().default(true),
    commandExecution: z.boolean().default(true),
    fileOperations: z.boolean().default(true),
    gitOperations: z.boolean().default(true)
  }),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    autoRecognition: z.boolean().default(true)
  })
});

// Default configuration
export const defaultMCPConfig: MCPConfig = {
  autoRecognition: {
    enabled: true,
    patterns: [
      {
        type: 'cursor',
        pattern: 'cursor|ide|editor|code|file|project|workspace',
        description: 'Patterns related to Cursor IDE interactions'
      },
      {
        type: 'command',
        pattern: 'run|execute|command|cli|terminal|shell|npm|bun|yarn',
        description: 'Patterns related to command execution'
      }
    ],
    confidenceThreshold: 0.7
  },
  features: {
    cursorIntegration: true,
    commandExecution: true,
    fileOperations: true,
    gitOperations: true
  },
  logging: {
    level: 'info',
    autoRecognition: true
  }
};

// Configuration type
export type MCPConfig = z.infer<typeof MCPConfigSchema>;

// Configuration manager class
export class MCPConfigManager {
  private static instance: MCPConfigManager;
  private config: MCPConfig;

  private constructor() {
    this.config = defaultMCPConfig;
  }

  public static getInstance(): MCPConfigManager {
    if (!MCPConfigManager.instance) {
      MCPConfigManager.instance = new MCPConfigManager();
    }
    return MCPConfigManager.instance;
  }

  public getConfig(): MCPConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<MCPConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }

  public shouldHandleCursorInteraction(text: string): boolean {
    if (!this.config.autoRecognition.enabled) return false;
    
    const cursorPatterns = this.config.autoRecognition.patterns
      .filter((p: Pattern) => p.type === 'cursor')
      .map((p: Pattern) => new RegExp(p.pattern, 'i'));
    
    return cursorPatterns.some((pattern: RegExp) => pattern.test(text));
  }

  public shouldHandleCommand(text: string): boolean {
    if (!this.config.autoRecognition.enabled) return false;
    
    const commandPatterns = this.config.autoRecognition.patterns
      .filter((p: Pattern) => p.type === 'command')
      .map((p: Pattern) => new RegExp(p.pattern, 'i'));
    
    return commandPatterns.some((pattern: RegExp) => pattern.test(text));
  }

  public getFeatureStatus(feature: keyof typeof defaultMCPConfig.features): boolean {
    return this.config.features[feature];
  }
} 