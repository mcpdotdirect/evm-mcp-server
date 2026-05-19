import { jest } from "@jest/globals";

describe("src/index.ts", () => {
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    jest.resetModules();
    console.error = jest.fn();
    console.log = jest.fn();
    jest.spyOn(process, "exit").mockImplementation((() => {}) as never);
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    jest.restoreAllMocks();
  });

  describe("main() function - success path", () => {
    it("should start the server and connect to transport successfully", async () => {
      // Create mocks
      const mockConnect = jest.fn();
      const mockServer = { connect: mockConnect };
      const mockStartServer = jest.fn();
      mockStartServer.mockImplementation(() => Promise.resolve(mockServer));
      const mockTransportInstance = {};
      const MockStdioServerTransport = jest.fn();
      MockStdioServerTransport.mockImplementation(() => mockTransportInstance);

      // Set up mocks using doMock before import
      (jest as any).doMock("./server/server.js", () => {
        return {
          __esModule: true,
          default: mockStartServer
        };
      });

      (jest as any).doMock("@modelcontextprotocol/sdk/server/stdio.js", () => {
        return {
          StdioServerTransport: MockStdioServerTransport
        };
      });

      // Import the module to trigger main() execution
      await import("./index.js");
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify startServer was called
      expect(mockStartServer).toHaveBeenCalledTimes(1);

      // Verify StdioServerTransport was instantiated
      expect(MockStdioServerTransport).toHaveBeenCalledTimes(1);

      // Verify server.connect was called with the transport
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockConnect).toHaveBeenCalledWith(mockTransportInstance);

      // Verify success message was logged
      expect(console.error).toHaveBeenCalledWith("EVM MCP Server running on stdio");
    });
  });

  describe("main() function - error handling", () => {
    it("should handle errors during server startup and exit with code 1", async () => {
      const testError = new Error("Server startup failed");
      const mockConnect = jest.fn();
      const mockServer = { connect: mockConnect };
      const mockStartServer = jest.fn();
      mockStartServer.mockImplementation(() => Promise.reject(testError));
      const mockTransportInstance = {};
      const MockStdioServerTransport = jest.fn();
      MockStdioServerTransport.mockImplementation(() => mockTransportInstance);

      (jest as any).doMock("./server/server.js", () => {
        return {
          __esModule: true,
          default: mockStartServer
        };
      });

      (jest as any).doMock("@modelcontextprotocol/sdk/server/stdio.js", () => {
        return {
          StdioServerTransport: MockStdioServerTransport
        };
      });

      // Import the module to trigger main() execution
      await import("./index.js");
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        "Error starting MCP server:",
        testError
      );

      // Verify process.exit was called with code 1
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle errors during server.connect", async () => {
      const connectError = new Error("Connection failed");
      const mockConnect = jest.fn();
      mockConnect.mockImplementation(() => Promise.reject(connectError));
      const mockServer = { connect: mockConnect };
      const mockStartServer = jest.fn();
      mockStartServer.mockImplementation(() => Promise.resolve(mockServer));
      const mockTransportInstance = {};
      const MockStdioServerTransport = jest.fn();
      MockStdioServerTransport.mockImplementation(() => mockTransportInstance);

      (jest as any).doMock("./server/server.js", () => {
        return {
          __esModule: true,
          default: mockStartServer
        };
      });

      (jest as any).doMock("@modelcontextprotocol/sdk/server/stdio.js", () => {
        return {
          StdioServerTransport: MockStdioServerTransport
        };
      });

      // Import the module to trigger main() execution
      await import("./index.js");
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith(
        "Error starting MCP server:",
        connectError
      );

      // Verify process.exit was called with code 1
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle errors in main's try-catch block", async () => {
      const testError = new Error("Error in main");
      const mockConnect = jest.fn();
      const mockServer = { connect: mockConnect };
      const mockStartServer = jest.fn();
      mockStartServer.mockImplementation(() => Promise.reject(testError));
      const mockTransportInstance = {};
      const MockStdioServerTransport = jest.fn();
      MockStdioServerTransport.mockImplementation(() => mockTransportInstance);

      (jest as any).doMock("./server/server.js", () => {
        return {
          __esModule: true,
          default: mockStartServer
        };
      });

      (jest as any).doMock("@modelcontextprotocol/sdk/server/stdio.js", () => {
        return {
          StdioServerTransport: MockStdioServerTransport
        };
      });

      // Import the module to trigger main() execution
      await import("./index.js");
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Error from startServer is caught by the inner try-catch in main()
      // which logs "Error starting MCP server:"
      expect(console.error).toHaveBeenCalledWith(
        "Error starting MCP server:",
        testError
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe("module structure", () => {
    it("should import startServer from server module", async () => {
      const mockConnect = jest.fn();
      const mockServer = { connect: mockConnect };
      const mockStartServer = jest.fn();
      mockStartServer.mockImplementation(() => Promise.resolve(mockServer));
      const mockTransportInstance = {};
      const MockStdioServerTransport = jest.fn();
      MockStdioServerTransport.mockImplementation(() => mockTransportInstance);

      (jest as any).doMock("./server/server.js", () => {
        return {
          __esModule: true,
          default: mockStartServer
        };
      });

      (jest as any).doMock("@modelcontextprotocol/sdk/server/stdio.js", () => {
        return {
          StdioServerTransport: MockStdioServerTransport
        };
      });

      // The module should import successfully
      const indexModule = await import("./index.js");
      expect(indexModule).toBeDefined();
    });

    it("should use StdioServerTransport for transport", async () => {
      const mockConnect = jest.fn();
      const mockServer = { connect: mockConnect };
      const mockStartServer = jest.fn();
      mockStartServer.mockImplementation(() => Promise.resolve(mockServer));
      const mockTransportInstance = {};
      const MockStdioServerTransport = jest.fn();
      MockStdioServerTransport.mockImplementation(() => mockTransportInstance);

      (jest as any).doMock("./server/server.js", () => {
        return {
          __esModule: true,
          default: mockStartServer
        };
      });

      (jest as any).doMock("@modelcontextprotocol/sdk/server/stdio.js", () => {
        return {
          StdioServerTransport: MockStdioServerTransport
        };
      });

      // Import the module to trigger main() execution
      await import("./index.js");
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(MockStdioServerTransport).toHaveBeenCalled();
    });
  });
});
