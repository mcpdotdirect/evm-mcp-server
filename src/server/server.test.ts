import startServer from "./server.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEVMResources } from "../core/resources.js";
import { registerEVMTools } from "../core/tools.js";
import { registerEVMPrompts } from "../core/prompts.js";
import { getSupportedNetworks } from "../core/chains.js";

// Mock the dependencies
jest.mock("../core/resources.js");
jest.mock("../core/tools.js");
jest.mock("../core/prompts.js");
jest.mock("../core/chains.js");
jest.mock("@modelcontextprotocol/sdk/server/mcp.js");

describe("server", () => {
  const mockServer = {
    registerResource: jest.fn(),
    registerTool: jest.fn(),
    registerPrompt: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (McpServer as jest.MockedClass<typeof McpServer>).mockImplementation(() => mockServer as unknown as McpServer);
    (getSupportedNetworks as jest.Mock).mockReturnValue(["ethereum", "optimism", "arbitrum"]);
  });

  describe("startServer", () => {
    it("should create a new McpServer instance with correct configuration", async () => {
      await startServer();

      expect(McpServer).toHaveBeenCalledTimes(1);
      expect(McpServer).toHaveBeenCalledWith(
        {
          name: "evm-mcp-server",
          version: "2.0.0"
        },
        {
          capabilities: {
            tools: {
              listChanged: true
            },
            resources: {
              subscribe: false,
              listChanged: true
            },
            prompts: {
              listChanged: true
            },
            logging: {}
          }
        }
      );
    });

    it("should register EVM resources", async () => {
      await startServer();

      expect(registerEVMResources).toHaveBeenCalledTimes(1);
      expect(registerEVMResources).toHaveBeenCalledWith(mockServer);
    });

    it("should register EVM tools", async () => {
      await startServer();

      expect(registerEVMTools).toHaveBeenCalledTimes(1);
      expect(registerEVMTools).toHaveBeenCalledWith(mockServer);
    });

    it("should register EVM prompts", async () => {
      await startServer();

      expect(registerEVMPrompts).toHaveBeenCalledTimes(1);
      expect(registerEVMPrompts).toHaveBeenCalledWith(mockServer);
    });

    it("should log server initialization information", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      await startServer();

      expect(consoleSpy).toHaveBeenCalledWith("EVM MCP Server v2.0.0 initialized");
      expect(consoleSpy).toHaveBeenCalledWith("Protocol: MCP 2025-06-18");
      expect(consoleSpy).toHaveBeenCalledWith("Supported networks: 3 networks");
      expect(consoleSpy).toHaveBeenCalledWith("Server is ready to handle requests");

      consoleSpy.mockRestore();
    });

    it("should return the server instance", async () => {
      const result = await startServer();

      expect(result).toBe(mockServer);
    });

    it("should handle initialization errors and exit process", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const processExitSpy = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);

      (registerEVMResources as jest.Mock).mockImplementation(() => {
        throw new Error("Initialization failed");
      });

      await startServer();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to initialize server:",
        expect.any(Error)
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });
});
