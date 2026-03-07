import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { VaultClient } from "../vault-client.js";

export function registerVaultQuery(server: McpServer, vaultClient: VaultClient) {
  server.registerTool(
    "vault_query",
    {
      inputSchema: z.object({
        query: z.string().describe("The VQL query to execute (e.g., 'SELECT id, name__v FROM product__v')"),
      }),
    },
    async ({ query }) => {
      try {
        const params = new URLSearchParams();
        params.append("q", query);
        const response = await vaultClient.post("/query", params);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Query failed: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
