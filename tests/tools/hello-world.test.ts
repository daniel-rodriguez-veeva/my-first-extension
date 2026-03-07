import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerHelloWorld } from '../../src/tools/hello-world.js';

describe('Hello World Tool', () => {
  let server: McpServer;
  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;

  beforeEach(async () => {
    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerHelloWorld(server);

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

  it('should register hello_world tool', async () => {
    const tools = await client.listTools();
    const helloWorldTool = tools.tools.find(t => t.name === 'hello_world');
    expect(helloWorldTool).toBeDefined();
  });

  it('should return hello world message', async () => {
    const result = await client.callTool({ name: 'hello_world', arguments: {} });
    if ('content' in result) {
      expect((result.content[0] as any).text).toBe('Hello, world! This is your first Gemini extension.');
    } else {
      throw new Error('Unexpected result format');
    }
  });

  it('should return personalized message', async () => {
    const result = await client.callTool({ name: 'hello_world', arguments: { name: 'Gemini' } });
    if ('content' in result) {
      expect((result.content[0] as any).text).toBe('Hello, Gemini! This is your first Gemini extension.');
    } else {
      throw new Error('Unexpected result format');
    }
  });
});
