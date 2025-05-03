declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export class McpServer {
    constructor();
    prompt(
      name: string,
      description: string,
      schema: any,
      handler: (params: any) => { messages: Array<{ role: string; content: { type: string; text: string } }> }
    ): void;
  }
} 