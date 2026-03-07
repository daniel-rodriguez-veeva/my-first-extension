import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { VaultClient } from "../vault-client.js";

export function registerVaultAuth(server: McpServer, vaultClient: VaultClient) {
  server.registerTool(
    "vault_auth",
    {
      inputSchema: z.object({
        action: z
          .enum(["end_session", "list_delegations", "initiate_delegated_session", "discovery"])
          .describe("The authentication action"),
        delegator_id: z.string().optional().describe("Delegator User ID (required for initiate_delegated_session)"),
        vault_dns: z
          .string()
          .optional()
          .describe("Vault DNS (for discovery if needed, though usually client is bound)"),
      }),
    },
    async ({ action, delegator_id }) => {
      try {
        let response;
        switch (action) {
          case "end_session":
            // DELETE /session
            response = await vaultClient.delete("/session");
            break;
          case "list_delegations":
            // GET /delegations
            response = await vaultClient.get("/delegations");
            break;
          case "initiate_delegated_session":
            if (!delegator_id) throw new Error("delegator_id is required");
            // POST /delegations/{id}/session
            response = await vaultClient.post(`/delegations/${delegator_id}/session`);
            break;
          case "discovery":
            // GET /auth/discovery
            response = await vaultClient.get("/auth/discovery");
            break;
        }
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: `Auth operation failed: ${message}` }], isError: true };
      }
    },
  );
}
