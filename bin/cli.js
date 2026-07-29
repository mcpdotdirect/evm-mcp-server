#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Parse command line arguments
const args = process.argv.slice(2);
const httpMode = args.includes('--http') || args.includes('-h');

console.error(`Starting EVM MCP Server in ${httpMode ? 'HTTP' : 'stdio'} mode...`);

// Determine which file to execute
const scriptPath = resolve(__dirname, '../build', httpMode ? 'http-server.js' : 'index.js');

try {
  // Check if the built files exist
  require.resolve(scriptPath);
  
  // Execute the server
  const server = spawn('node', [scriptPath], {
    stdio: 'inherit',
    shell: false
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  // Handle clean shutdown
  const cleanup = () => {
    if (!server.killed) {
      server.kill();
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

} catch (error) {
  console.error('Error: Server files not found. The package may not be built correctly.');
  console.error('Please try reinstalling the package or contact the maintainers.');
  console.error(error);
  process.exit(1);
}
