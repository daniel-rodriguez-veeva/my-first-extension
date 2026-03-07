import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { VaultClient } from "../vault-client.js";

export function registerVaultApiCall(server: McpServer, vaultClient: VaultClient) {
  server.registerTool(
    "vault_api_call",
    {
      inputSchema: z.object({
        endpoint: z.string().describe("The API endpoint path (e.g., '/objects/documents')"),
        method: z.enum(["GET", "POST", "PUT", "DELETE"]).describe("The HTTP method"),
        body: z.any().optional().describe("The JSON body for POST/PUT requests"),
      }),
    },
    async ({ endpoint, method, body }) => {
      try {
        const response = await vaultClient.request({
          url: endpoint,
          method: method,
          data: body,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `API Call failed: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
