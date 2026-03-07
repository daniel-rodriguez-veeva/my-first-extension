import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerVaultQuery } from '../../src/tools/vql.js';
import { VaultClient } from '../../src/vault-client.js';
import { getConfig } from '../../src/config.js';

describe('Vault Query Tool', () => {
  let server: McpServer;
  let vaultClient: VaultClient;
  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;

  beforeEach(async () => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    const config = getConfig();
    vaultClient = new VaultClient(config);
    
    vi.spyOn(vaultClient, 'post').mockResolvedValue({ responseStatus: 'SUCCESS', data: [] });
    
    registerVaultQuery(server, vaultClient);

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

  it('should call query with correct parameters', async () => {
    const spy = vi.spyOn(vaultClient, 'post');
    const query = 'SELECT id FROM product__v';
    await client.callTool({ name: 'vault_query', arguments: { query } });
    
    expect(spy).toHaveBeenCalledWith('/query', expect.any(URLSearchParams));
    const sentParams = spy.mock.calls[0][1] as URLSearchParams;
    expect(sentParams.get('q')).toBe(query);
  });
});
