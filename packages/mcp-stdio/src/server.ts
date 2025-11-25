import crypto from "node:crypto";
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version?: string };
import {
  CurlRequestInput,
  CurlResponse,
  executeHttpRequest
} from "@curl-mcp/core-engine";

const SERVER_VERSION = pkg.version ?? "0.0.0";

const CurlInputSchema = z.object({
  url: z
    .string()
    .url()
    .describe("Full URL to request (e.g., https://example.com/api)"),
  method: z
    .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
    .describe("HTTP method to use"),
  headers: z
    .record(z.string())
    .optional()
    .describe("Optional headers to send with the request"),
  body: z
    .string()
    .nullable()
    .optional()
    .describe("Request body as a string (omit for GET/HEAD)"),
  timeout_seconds: z
    .number()
    .int()
    .positive()
    .max(120)
    .optional()
    .describe("Timeout in seconds (1-120, default 30)"),
  response_type: z
    .enum(["text", "json", "binary"])
    .optional()
    .describe("How to return the response body: text (default), json (parsed), or binary (base64).")
});

const server = new McpServer({
  name: "curl-mcp-stdio",
  version: SERVER_VERSION
});

server.registerTool(
  "curl_request",
  {
    description: "Perform an HTTP request via curl-like interface.",
    inputSchema: CurlInputSchema
  },
  async (args): Promise<any> => {
    const ctx = {
      request_id: crypto.randomUUID(),
      source: "stdio",
      timestamp: Date.now()
    };

    const result: CurlResponse = await executeHttpRequest(
      ctx,
      args as CurlRequestInput
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }
);

server.registerTool(
  "mcp_version",
  {
    description: "Return version information for the curl-mcp stdio server."
  },
  async (): Promise<any> => {
    return {
      content: [
        {
          type: "text",
          text: `curl-mcp-stdio version ${SERVER_VERSION} (Calibress, Craig Prescott, November 2025)`
        }
      ]
    };
  }
);

const transport = new StdioServerTransport();

const start = async () => {
  // connect() will start the transport for stdio
  await server.connect(transport);
  // Ensure the process stays alive awaiting stdio traffic
  process.stdin.resume();
};

start().catch((error) => {
  console.error("Failed to start MCP stdio server:", error);
  process.exit(1);
});
