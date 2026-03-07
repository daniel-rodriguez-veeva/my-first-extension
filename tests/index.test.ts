import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VaultClient } from '../src/vault-client.js';
import { getConfig } from '../src/config.js';
import { registerVaultAuth } from '../src/tools/authentication.js';
import { registerHelloWorld } from '../src/tools/hello-world.js';
import { registerExtensionHelper } from '../src/prompts/extension-helper.js';

describe('MCP Server Integration', () => {
  let server: McpServer;
  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;

  beforeEach(async () => {
    // Create a fresh server for each test to avoid "already registered" errors
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    
    const config = getConfig();
    const vaultClient = new VaultClient(config);

    // Register all tools and prompts
    registerVaultAuth(server, vaultClient);
    registerHelloWorld(server);
    registerExtensionHelper(server);

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

  it('should have all tools registered', async () => {
    const tools = await client.listTools();
    const toolNames = tools.tools.map(t => t.name);
    
    expect(toolNames).toContain('hello_world');
    expect(toolNames).toContain('vault_auth');
  });

  it('should have the extension-helper prompt registered', async () => {
    const prompts = await client.listPrompts();
    const helperPrompt = prompts.prompts.find(p => p.name === 'extension-helper');
    
    expect(helperPrompt).toBeDefined();
  });

  it('should return hello world message from the integrated server', async () => {
    const result = await client.callTool({ name: 'hello_world', arguments: {} });
    
    if ('content' in result) {
      const content = result.content as any[];
      expect(content[0].text).toContain('Hello, world!');
    } else {
      throw new Error('Unexpected result format');
    }
  });
});
