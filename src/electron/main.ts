import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { MCPConfigManager } from '../core/config/mcp-config.js';
import { AutoRecognitionService } from '../core/services/auto-recognition.js';
import { logger } from '../core/utils/logger.js';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Communication
ipcMain.handle('get-config', async () => {
  const configManager = MCPConfigManager.getInstance();
  return configManager.getConfig();
});

ipcMain.handle('update-config', async (event, newConfig) => {
  const configManager = MCPConfigManager.getInstance();
  configManager.updateConfig(newConfig);
  return configManager.getConfig();
});

ipcMain.handle('analyze-text', async (event, text) => {
  const recognitionService = AutoRecognitionService.getInstance();
  return recognitionService.analyzeText(text);
});

ipcMain.handle('get-feature-status', async (event, feature) => {
  const recognitionService = AutoRecognitionService.getInstance();
  return recognitionService.isFeatureEnabled(feature);
});

// Logging
ipcMain.handle('log', async (event, level, message, data) => {
  logger[level](message, data);
}); 