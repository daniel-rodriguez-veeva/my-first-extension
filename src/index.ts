import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerVaultAuth } from './tools/authentication.js';
import { registerHelloWorld } from './tools/hello-world.js';
import { registerVaultQuery } from './tools/vql.js';
import { registerVaultMetadata } from './tools/mdl.js';
import { registerVaultApiCall } from './tools/api.js';
import { registerExtensionHelper } from './prompts/extension-helper.js';
import { getConfig } from './config.js';
import { VaultClient } from './vault-client.js';

export const server = new McpServer({
  name: 'my-first-extension-server',
  version: '1.0.0',
});

export async function run() {

  const config = getConfig();
  const vaultClient = new VaultClient(config);

  // Register tools
  registerVaultAuth(server, vaultClient);
  registerVaultQuery(server, vaultClient);
  registerVaultMetadata(server, vaultClient);
  registerVaultApiCall(server, vaultClient);
  registerHelloWorld(server);

  // Register prompts
  registerExtensionHelper(server);


  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}

// In ES modules, we check if this file is the entry point using import.meta.url
console.error('meta:', import.meta.url);
console.error('argv1:', process.argv[1]);
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  run().catch((error) => {
    console.error('Fatal error in MCP Server:', error);
    process.exit(1);
  });
}
