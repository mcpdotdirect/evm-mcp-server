interface Window {
  api: {
    // Configuration methods
    getConfig: () => Promise<any>;
    updateConfig: (config: any) => Promise<any>;
    
    // Analysis methods
    analyzeText: (text: string) => Promise<any>;
    getFeatureStatus: (feature: string) => Promise<boolean>;
    
    // Logging methods
    log: (level: string, message: string, data?: any) => Promise<void>;
  }
} 