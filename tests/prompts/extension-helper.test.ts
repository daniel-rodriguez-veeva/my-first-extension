import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerExtensionHelper } from '../../src/prompts/extension-helper.js';

describe('Extension Helper Prompt', () => {
  let server: McpServer;
  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;

  beforeEach(async () => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
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

  it('should register extension-helper prompt', async () => {
    const prompts = await client.listPrompts();
    const helperPrompt = prompts.prompts.find(p => p.name === 'extension-helper');
    expect(helperPrompt).toBeDefined();
  });

  it('should return correct prompt messages when called', async () => {
    const result = await client.getPrompt({ name: 'extension-helper', arguments: { topic: 'Testing' } });
    
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.type).toBe('text');
    expect((result.messages[0].content as any).text).toBe('Explain how to build a Gemini extension for the topic: Testing');
  });
});
