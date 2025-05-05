import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Configuration methods
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateConfig: (config: any) => ipcRenderer.invoke('update-config', config),
    
    // Analysis methods
    analyzeText: (text: string) => ipcRenderer.invoke('analyze-text', text),
    getFeatureStatus: (feature: string) => ipcRenderer.invoke('get-feature-status', feature),
    
    // Logging methods
    log: (level: string, message: string, data?: any) => 
      ipcRenderer.invoke('log', level, message, data),
  }
); 