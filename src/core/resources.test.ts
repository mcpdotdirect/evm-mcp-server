import { registerEVMResources } from './resources.js';
import { getSupportedNetworks } from './chains.js';

// Mock the chains module
jest.mock('./chains.js', () => ({
  getSupportedNetworks: jest.fn(),
}));

describe('resources', () => {
  describe('registerEVMResources', () => {
    let mockServer: { registerResource: jest.Mock };

    beforeEach(() => {
      mockServer = {
        registerResource: jest.fn(),
      };
      jest.clearAllMocks();
    });

    it('should register the supported_networks resource', () => {
      registerEVMResources(mockServer as any);

      expect(mockServer.registerResource).toHaveBeenCalledTimes(1);
      expect(mockServer.registerResource).toHaveBeenCalledWith(
        'supported_networks',
        'evm://networks',
        {
          description: 'Get list of all supported EVM networks and their configuration',
          mimeType: 'application/json',
        },
        expect.any(Function),
      );
    });

    it('should return supported networks in the resource handler', async () => {
      const mockNetworks = ['ethereum', 'optimism', 'arbitrum', 'base'];
      (getSupportedNetworks as jest.Mock).mockReturnValue(mockNetworks);

      registerEVMResources(mockServer as any);

      // Get the handler function from the registerResource call (5th argument, index 4)
      const callArgs = mockServer.registerResource.mock.calls[0];
      const handler = callArgs[callArgs.length - 1];
      const result = await handler({ href: 'evm://networks' });

      expect(getSupportedNetworks).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        contents: [{
          uri: 'evm://networks',
          text: JSON.stringify({ supportedNetworks: mockNetworks }, null, 2),
        }],
      });
    });

    it('should handle errors when getSupportedNetworks throws', async () => {
      const errorMessage = 'Network error';
      (getSupportedNetworks as jest.Mock).mockImplementation(() => {
        throw new Error(errorMessage);
      });

      registerEVMResources(mockServer as any);

      const callArgs = mockServer.registerResource.mock.calls[0];
      const handler = callArgs[callArgs.length - 1];
      const result = await handler({ href: 'evm://networks' });

      expect(getSupportedNetworks).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        contents: [{
          uri: 'evm://networks',
          text: `Error: ${errorMessage}`,
        }],
      });
    });

    it('should handle non-Error exceptions', async () => {
      (getSupportedNetworks as jest.Mock).mockImplementation(() => {
        throw 'Unknown error';
      });

      registerEVMResources(mockServer as any);

      const callArgs = mockServer.registerResource.mock.calls[0];
      const handler = callArgs[callArgs.length - 1];
      const result = await handler({ href: 'evm://networks' });

      expect(getSupportedNetworks).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        contents: [{
          uri: 'evm://networks',
          text: 'Error: Unknown error',
        }],
      });
    });

    it('should use the correct URI from the request', async () => {
      const mockNetworks = ['ethereum'];
      (getSupportedNetworks as jest.Mock).mockReturnValue(mockNetworks);

      registerEVMResources(mockServer as any);

      const callArgs = mockServer.registerResource.mock.calls[0];
      const handler = callArgs[callArgs.length - 1];
      const customUri = 'evm://custom-networks';
      const result = await handler({ href: customUri });

      expect(result.contents[0].uri).toBe(customUri);
    });

    it('should return empty array when getSupportedNetworks returns empty', async () => {
      (getSupportedNetworks as jest.Mock).mockReturnValue([]);

      registerEVMResources(mockServer as any);

      const callArgs = mockServer.registerResource.mock.calls[0];
      const handler = callArgs[callArgs.length - 1];
      const result = await handler({ href: 'evm://networks' });

      expect(result).toEqual({
        contents: [{
          uri: 'evm://networks',
          text: JSON.stringify({ supportedNetworks: [] }, null, 2),
        }],
      });
    });
  });
});
