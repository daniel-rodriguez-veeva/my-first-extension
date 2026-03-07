import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerHelloWorld(server: McpServer) {
  server.registerTool(
    "hello_world",
    {
      description: "A simple tool that says hello",
      inputSchema: z.object({
        name: z.string().optional(),
      }),
    },
    async ({ name }) => {
      return {
        content: [
          {
            type: "text",
            text: `Hello, ${name || "world"}! This is your first Gemini extension.`,
          },
        ],
      };
    },
  );
}
