import { MCPConfigManager } from '../../config/core/mcp-config.js';
import { logger } from '../utils/logger.js';

interface Pattern {
  type: 'cursor' | 'command';
  pattern: string;
  description: string;
}

export class AutoRecognitionService {
  private static instance: AutoRecognitionService;
  private configManager: MCPConfigManager;

  private constructor() {
    this.configManager = MCPConfigManager.getInstance();
  }

  public static getInstance(): AutoRecognitionService {
    if (!AutoRecognitionService.instance) {
      AutoRecognitionService.instance = new AutoRecognitionService();
    }
    return AutoRecognitionService.instance;
  }

  public analyzeText(text: string): {
    shouldHandle: boolean;
    type: 'cursor' | 'command' | 'none';
    confidence: number;
  } {
    const config = this.configManager.getConfig();
    if (!config.autoRecognition.enabled) {
      return {
        shouldHandle: false,
        type: 'none',
        confidence: 0
      };
    }

    // Calculate confidence scores for each type
    const cursorScore = this.calculateConfidence(text, 'cursor');
    const commandScore = this.calculateConfidence(text, 'command');

    // Determine the highest confidence and type
    const maxScore = Math.max(cursorScore, commandScore);
    const type = maxScore === cursorScore ? 'cursor' : 
                maxScore === commandScore ? 'command' : 'none';

    const shouldHandle = maxScore >= config.autoRecognition.confidenceThreshold;

    if (config.logging.autoRecognition) {
      logger.info('Auto-recognition analysis:', {
        text,
        type,
        confidence: maxScore,
        shouldHandle
      });
    }

    return {
      shouldHandle,
      type,
      confidence: maxScore
    };
  }

  private calculateConfidence(text: string, type: 'cursor' | 'command'): number {
    const patterns = this.configManager.getConfig().autoRecognition.patterns
      .filter((p: Pattern) => p.type === type)
      .map((p: Pattern) => new RegExp(p.pattern, 'i'));

    if (patterns.length === 0) return 0;

    // Calculate confidence based on pattern matches
    const matches = patterns.filter((pattern: RegExp) => pattern.test(text)).length;
    const confidence = matches / patterns.length;

    return confidence;
  }

  public shouldHandleCursorInteraction(text: string): boolean {
    return this.configManager.shouldHandleCursorInteraction(text);
  }

  public shouldHandleCommand(text: string): boolean {
    return this.configManager.shouldHandleCommand(text);
  }

  public isFeatureEnabled(feature: keyof typeof this.configManager.getConfig().features): boolean {
    return this.configManager.getFeatureStatus(feature);
  }
} 