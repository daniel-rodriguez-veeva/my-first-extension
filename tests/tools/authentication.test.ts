import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerVaultAuth } from '../../src/tools/authentication.js';
import { VaultClient } from '../../src/vault-client.js';
import { getConfig } from '../../src/config.js';

describe('Vault Auth Tool', () => {
  let server: McpServer;
  let vaultClient: VaultClient;
  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;

  beforeEach(async () => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    const config = getConfig();
    vaultClient = new VaultClient(config);
    
    // Mock VaultClient methods
    vi.spyOn(vaultClient, 'get').mockResolvedValue({ responseStatus: 'SUCCESS' });
    vi.spyOn(vaultClient, 'post').mockResolvedValue({ responseStatus: 'SUCCESS' });
    vi.spyOn(vaultClient, 'delete').mockResolvedValue({ responseStatus: 'SUCCESS' });
    
    registerVaultAuth(server, vaultClient);

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

  it('should register vault_auth tool', async () => {
    const tools = await client.listTools();
    const vaultAuthTool = tools.tools.find(t => t.name === 'vault_auth');
    expect(vaultAuthTool).toBeDefined();
  });

  it('should call discovery action', async () => {
    const spy = vi.spyOn(vaultClient, 'get');
    const result = await client.callTool({ name: 'vault_auth', arguments: { action: 'discovery' } });
    
    expect(spy).toHaveBeenCalledWith('/auth/discovery');
    if ('content' in result) {
      expect(result.content[0].type).toBe('text');
      expect(JSON.parse((result.content[0] as any).text).responseStatus).toBe('SUCCESS');
    } else {
      throw new Error('Unexpected result format');
    }
  });

  it('should call end_session action', async () => {
    const spy = vi.spyOn(vaultClient, 'delete');
    const result = await client.callTool({ name: 'vault_auth', arguments: { action: 'end_session' } });
    
    expect(spy).toHaveBeenCalledWith('/session');
    if ('content' in result) {
      expect(JSON.parse((result.content[0] as any).text).responseStatus).toBe('SUCCESS');
    } else {
      throw new Error('Unexpected result format');
    }
  });

  it('should call list_delegations action', async () => {
    const spy = vi.spyOn(vaultClient, 'get');
    const result = await client.callTool({ name: 'vault_auth', arguments: { action: 'list_delegations' } });
    
    expect(spy).toHaveBeenCalledWith('/delegations');
    if ('content' in result) {
      expect(JSON.parse((result.content[0] as any).text).responseStatus).toBe('SUCCESS');
    } else {
      throw new Error('Unexpected result format');
    }
  });

  it('should call initiate_delegated_session action', async () => {
    const spy = vi.spyOn(vaultClient, 'post');
    const result = await client.callTool({ name: 'vault_auth', arguments: { action: 'initiate_delegated_session', delegator_id: '123' } });
    
    expect(spy).toHaveBeenCalledWith('/delegations/123/session');
    if ('content' in result) {
      expect(JSON.parse((result.content[0] as any).text).responseStatus).toBe('SUCCESS');
    } else {
      throw new Error('Unexpected result format');
    }
  });

  it('should return error if delegator_id is missing for initiate_delegated_session', async () => {
    const result = await client.callTool({ name: 'vault_auth', arguments: { action: 'initiate_delegated_session' } });
    
    expect(result.isError).toBe(true);
    if ('content' in result) {
      expect((result.content[0] as any).text).toContain('delegator_id is required');
    } else {
      throw new Error('Unexpected result format');
    }
  });
});
