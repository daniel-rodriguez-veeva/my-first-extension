import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerExtensionHelper(server: McpServer) {
  server.registerPrompt(
    "extension-helper",
    {
      title: "Extension Helper",
      description: "Ask for help with Gemini extensions",
      argsSchema: { topic: z.string() },
    },
    ({ topic }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Explain how to build a Gemini extension for the topic: ${topic}`,
          },
        },
      ],
    }),
  );
}
