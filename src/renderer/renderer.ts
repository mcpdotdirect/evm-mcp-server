// DOM Elements
const configForm = document.getElementById('config-form')!;
const textInput = document.getElementById('text-input') as HTMLInputElement;
const analyzeBtn = document.getElementById('analyze-btn')!;
const analysisResult = document.getElementById('analysis-result')!;
const logsContainer = document.getElementById('logs')!;

// Load and display configuration
async function loadConfig() {
  try {
    const config = await window.api.getConfig();
    renderConfigForm(config);
  } catch (error) {
    log('error', 'Failed to load configuration', error);
  }
}

// Render configuration form
function renderConfigForm(config: any) {
  configForm.innerHTML = '';
  
  // Features section
  const featuresDiv = document.createElement('div');
  featuresDiv.className = 'space-y-4';
  featuresDiv.innerHTML = '<h3 class="text-lg font-medium">Features</h3>';
  
  Object.entries(config.features).forEach(([feature, enabled]) => {
    const featureDiv = document.createElement('div');
    featureDiv.className = 'flex items-center justify-between';
    featureDiv.innerHTML = `
      <span>${feature}</span>
      <label class="switch">
        <input type="checkbox" ${enabled ? 'checked' : ''} data-feature="${feature}">
        <span class="slider round"></span>
      </label>
    `;
    featuresDiv.appendChild(featureDiv);
  });
  configForm.appendChild(featuresDiv);

  // Add event listeners for feature toggles
  featuresDiv.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', async (e) => {
      const feature = (e.target as HTMLInputElement).dataset.feature!;
      const enabled = (e.target as HTMLInputElement).checked;
      try {
        const newConfig = await window.api.updateConfig({
          ...config,
          features: {
            ...config.features,
            [feature]: enabled
          }
        });
        log('info', `Feature "${feature}" ${enabled ? 'enabled' : 'disabled'}`);
      } catch (error) {
        log('error', `Failed to update feature "${feature}"`, error);
      }
    });
  });
}

// Handle text analysis
analyzeBtn.addEventListener('click', async () => {
  const text = textInput.value.trim();
  if (!text) return;

  try {
    const result = await window.api.analyzeText(text);
    displayAnalysisResult(result);
  } catch (error) {
    log('error', 'Failed to analyze text', error);
  }
});

// Display analysis results
function displayAnalysisResult(result: any) {
  analysisResult.innerHTML = `
    <div class="pattern-card p-4">
      <h3 class="text-lg font-medium mb-2">Analysis Result</h3>
      <div class="space-y-2">
        <p><strong>Type:</strong> ${result.type}</p>
        <p><strong>Confidence:</strong> ${(result.confidence * 100).toFixed(2)}%</p>
        <p><strong>Description:</strong> ${result.description}</p>
      </div>
    </div>
  `;
}

// Logging function
function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = document.createElement('div');
  logEntry.className = `mb-2 ${getLogLevelClass(level)}`;
  logEntry.textContent = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    const dataElement = document.createElement('pre');
    dataElement.className = 'mt-1 text-xs text-gray-400';
    dataElement.textContent = JSON.stringify(data, null, 2);
    logEntry.appendChild(dataElement);
  }
  
  logsContainer.appendChild(logEntry);
  logsContainer.scrollTop = logsContainer.scrollHeight;
  
  // Send log to main process
  window.api.log(level, message, data);
}

// Get CSS class for log level
function getLogLevelClass(level: string): string {
  switch (level) {
    case 'error': return 'text-red-400';
    case 'warn': return 'text-yellow-400';
    case 'info': return 'text-blue-400';
    case 'debug': return 'text-gray-400';
    default: return 'text-white';
  }
}

// Initialize the application
loadConfig(); 