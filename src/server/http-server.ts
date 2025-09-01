import { config } from "dotenv";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import startServer from "./server.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Environment variables
const PORT = 3000;
const HOST = '0.0.0.0';

console.error(`Starting EVM MCP Server on ${HOST}:${PORT}`);

// Setup Express
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['Content-Type', 'Access-Control-Allow-Origin']
}));

// Add OPTIONS handling for preflight requests
app.options('*', cors());

// Initialize the server
let server: McpServer | null = null;
startServer().then(s => {
  server = s;
  console.error("MCP Server initialized successfully");
}).catch(error => {
  console.error("Failed to initialize server:", error);
  process.exit(1);
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    server: server ? "initialized" : "not initialized"
  });
});

// SSE endpoint for StreamableHTTP connection
// @ts-ignore
app.get('/streamable', (req: Request, res: Response) => {
  console.error(`Received SSE connection request from ${req.ip}`);
  
  if (!server) {
    console.error("Server not initialized yet");
    return res.status(503).json({ error: "Server not initialized" });
  }
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  
  // Send initial connection message
  res.write('data: {"type":"connection","status":"connected"}\n\n');
  
  // Handle client disconnect
  req.on('close', () => {
    console.error('SSE connection closed');
  });
});

// Main MCP endpoint - stateless mode
// @ts-ignore
app.post('/streamable', async (req: Request, res: Response) => {
  console.error(`Received MCP request from ${req.ip}`);
  
  if (!server) {
    console.error("Server not initialized yet");
    return res.status(503).json({ error: "Server not initialized" });
  }
  
  try {
    // Create a new transport for each request (stateless mode)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless mode
      enableJsonResponse: true, // Return JSON instead of SSE
    });
    
    // Handle request close
    res.on('close', () => {
      console.error('Request closed');
      transport.close();
    });
    
    // Connect transport to server
    await server.connect(transport);
    
    // Handle the request
    await transport.handleRequest(req, res, req.body);
    
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: error instanceof Error ? error.message : String(error)
        },
        id: (req.body as any)?.id || null,
      });
    }
  }
});

// Start the server
const httpServer = app.listen(PORT, HOST, (error) => {
  if (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
  console.error(`EVM MCP Server listening on port ${PORT}`);
  console.error(`Endpoint: http://${HOST}:${PORT}/streamable`);
  console.error(`Health: http://${HOST}:${PORT}/health`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('\nReceived SIGINT, shutting down gracefully...');
  if (server) {
    server.close();
  }
  httpServer.close(() => {
    console.error('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.error('\nReceived SIGTERM, shutting down gracefully...');
  if (server) {
    server.close();
  }
  httpServer.close(() => {
    console.error('HTTP server closed');
    process.exit(0);
  });
}); 