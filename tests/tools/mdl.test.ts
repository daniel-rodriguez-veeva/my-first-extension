import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerVaultMetadata } from '../../src/tools/mdl.js';
import { VaultClient } from '../../src/vault-client.js';
import { getConfig } from '../../src/config.js';

describe('Vault Metadata Tool', () => {
  let server: McpServer;
  let vaultClient: VaultClient;
  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;

  beforeEach(async () => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    const config = getConfig();
    vaultClient = new VaultClient(config);
    
    vi.spyOn(vaultClient, 'get').mockResolvedValue({ responseStatus: 'SUCCESS' });
    vi.spyOn(vaultClient, 'post').mockResolvedValue({ responseStatus: 'SUCCESS' });
    vi.spyOn(vaultClient, 'request').mockResolvedValue({ responseStatus: 'SUCCESS' });
    
    registerVaultMetadata(server, vaultClient);

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

  it('should list components', async () => {
    const spy = vi.spyOn(vaultClient, 'get');
    await client.callTool({ name: 'vault_metadata', arguments: { action: 'list_components' } });
    expect(spy).toHaveBeenCalledWith('/metadata/components');
  });

  it('should execute MDL script', async () => {
    const spy = vi.spyOn(vaultClient, 'request');
    const mdl_script = 'RENAME Object product__v TO product_new__v;';
    await client.callTool({ name: 'vault_metadata', arguments: { action: 'execute_mdl', mdl_script } });
    
    expect(spy).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/mdl/execute',
      data: mdl_script,
      headers: { 'Content-Type': 'text/plain' }
    });
  });

  it('should retrieve async results', async () => {
    const spy = vi.spyOn(vaultClient, 'get');
    await client.callTool({ name: 'vault_metadata', arguments: { action: 'retrieve_async_results', job_id: '12345' } });
    expect(spy).toHaveBeenCalledWith('/api/mdl/execute_async/12345/results');
  });

  it('should execute MDL script async', async () => {
    const spy = vi.spyOn(vaultClient, 'request');
    const mdl_script = 'RENAME Object product__v TO product_new__v;';
    await client.callTool({ name: 'vault_metadata', arguments: { action: 'execute_mdl_async', mdl_script } });
    
    expect(spy).toHaveBeenCalledWith({
      method: 'POST',
      url: '/api/mdl/execute_async',
      data: mdl_script,
      headers: { 'Content-Type': 'text/plain' }
    });
  });

  it('should get component metadata', async () => {
    const spy = vi.spyOn(vaultClient, 'get');
    await client.callTool({ name: 'vault_metadata', arguments: { action: 'get_component', component_type: 'object__v' } });
    expect(spy).toHaveBeenCalledWith('/metadata/components/object__v');
  });

  it('should retrieve component records', async () => {
    const spy = vi.spyOn(vaultClient, 'get');
    await client.callTool({ name: 'vault_metadata', arguments: { action: 'retrieve_component_records', component_type: 'object__v' } });
    expect(spy).toHaveBeenCalledWith('/metadata/components/object__v/records');
  });

  it('should cancel deployment', async () => {
    const spy = vi.spyOn(vaultClient, 'post');
    await client.callTool({ name: 'vault_metadata', arguments: { action: 'cancel_deployment', object_name: 'product__v' } });
    expect(spy).toHaveBeenCalledWith('/metadata/vobjects/product__v/actions/canceldeployment');
  });

  it('should retrieve content', async () => {
    const spy = vi.spyOn(vaultClient, 'get');
    await client.callTool({ name: 'vault_metadata', arguments: { action: 'retrieve_content', component_type: 'object__v', record_id: '123' } });
    expect(spy).toHaveBeenCalledWith('/metadata/components/object__v/records/123/content');
  });
});
