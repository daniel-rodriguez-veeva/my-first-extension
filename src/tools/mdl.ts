import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { VaultClient } from "../vault-client.js";

export function registerVaultMetadata(server: McpServer, vaultClient: VaultClient) {
  server.registerTool(
    "vault_metadata",
    {
      inputSchema: z.object({
        action: z.enum([
          "execute_mdl",
          "execute_mdl_async",
          "retrieve_async_results",
          "cancel_deployment",
          "list_components",
          "get_component",
          "retrieve_component_records",
          "upload_content",
          "retrieve_content"
        ]).describe("Action to perform"),
        component_type: z.string().optional().describe("Component type (e.g. 'object__v', 'picklist__v')"),
        mdl_script: z.string().optional().describe("MDL script to execute"),
        job_id: z.string().optional().describe("Job ID for async results"),
        object_name: z.string().optional().describe("Object name for cancelling deployment"),
        record_id: z.string().optional().describe("Component record ID"),
        file_content: z.string().optional().describe("Content to upload (text)"),
        data: z.any().optional().describe("Legacy/Generic data payload"),
      }),
    },
    async ({ action, component_type, mdl_script, job_id, object_name, record_id, file_content, data }) => {
      try {
        let response;
        // Helper to ensure MDL script is provided either via specific arg or data
        const getScript = () => mdl_script || (typeof data === 'string' ? data : data?.script);

        switch (action) {
          case "execute_mdl":
          case "execute_mdl_async":
            {
              const script = getScript();
              if (!script) throw new Error("MDL script is required");
              const endpoint = action === "execute_mdl_async" ? "/api/mdl/execute_async" : "/api/mdl/execute";
              response = await vaultClient.request({
                method: "POST",
                url: endpoint,
                data: script,
                headers: { "Content-Type": "text/plain" }
              });
            }
            break;

          case "retrieve_async_results":
            if (!job_id) throw new Error("job_id is required");
            response = await vaultClient.get(`/api/mdl/execute_async/${job_id}/results`);
            break;

          case "cancel_deployment":
            if (!object_name) throw new Error("object_name is required");
            response = await vaultClient.post(`/metadata/vobjects/${object_name}/actions/canceldeployment`);
            break;

          case "list_components":
            response = await vaultClient.get("/metadata/components");
            break;

          case "get_component":
            if (!component_type) throw new Error("component_type is required");
            response = await vaultClient.get(`/metadata/components/${component_type}`);
            break;

          case "retrieve_component_records":
            if (!component_type) throw new Error("component_type is required");
            response = await vaultClient.get(`/metadata/components/${component_type}/records`);
            break;

          case "upload_content":
            if (!file_content) throw new Error("file_content is required");
            {
              const formData = new FormData();
              formData.append("file", new Blob([file_content]), "upload.txt");
              response = await vaultClient.request({
                method: "POST",
                url: "/api/mdl/files",
                data: formData
              });
            }
            break;

          case "retrieve_content":
             if (!component_type || !record_id) throw new Error("component_type and record_id are required");
             response = await vaultClient.get(`/metadata/components/${component_type}/records/${record_id}/content`);
             break;

          default:
             throw new Error(`Unknown action: ${action}`);
        }
        return { content: [{ type: "text", text: JSON.stringify(response, null, 2) }] };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return { content: [{ type: "text", text: `Metadata operation failed: ${message}` }], isError: true };
      }
    },
  );
}