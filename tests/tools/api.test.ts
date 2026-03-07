import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerVaultApiCall } from '../../src/tools/api.js';
import { VaultClient } from '../../src/vault-client.js';
import { getConfig } from '../../src/config.js';

describe('Vault API Call Tool', () => {
  let server: McpServer;
  let vaultClient: VaultClient;
  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;

  beforeEach(async () => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    const config = getConfig();
    vaultClient = new VaultClient(config);
    
    vi.spyOn(vaultClient, 'request').mockResolvedValue({ responseStatus: 'SUCCESS' });
    
    registerVaultApiCall(server, vaultClient);

    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '1.0.0' });
    
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterEach(async () => {
    await server.close();
  });

  it('should call api with correct parameters', async () => {
    const spy = vi.spyOn(vaultClient, 'request');
    const endpoint = '/objects/documents';
    const method = 'POST';
    const body = { name: 'test' };
    
    await client.callTool({ 
      name: 'vault_api_call', 
      arguments: { endpoint, method, body } 
    });
    
    expect(spy).toHaveBeenCalledWith({
      url: endpoint,
      method: method,
      data: body,
    });
  });

  it('should call api with GET method', async () => {
    const spy = vi.spyOn(vaultClient, 'request');
    const endpoint = '/objects/documents/123';
    const method = 'GET';
    
    await client.callTool({ 
      name: 'vault_api_call', 
      arguments: { endpoint, method } 
    });
    
    expect(spy).toHaveBeenCalledWith({
      url: endpoint,
      method: method,
      data: undefined,
    });
  });
});
