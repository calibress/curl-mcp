import crypto from "node:crypto";
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  CurlRequestInput,
  CurlResponse,
  executeHttpRequest
} from "@calibress/curl-mcp-core";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version?: string };

export const CurlInputSchema = z.object({
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
    .describe("Optional headers to send with the request (default User-Agent: curl-mcp/<version>)"),
  body: z
    .string()
    .nullable()
    .optional()
    .describe("Request body as a string (allowed for any method; omit for typical GET/HEAD)"),
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
    .describe("How to return the response body: text (default), json (parsed), or binary (base64)."),
  persist_session: z
    .boolean()
    .optional()
    .describe("Keep cookies in-memory per-host for chained calls."),
  follow_redirects: z
    .boolean()
    .optional()
    .describe("Follow redirects automatically (default true). Set false to capture redirect responses."),
  clear_session: z
    .boolean()
    .optional()
    .describe(
      "Clear stored cookies for this host before the request (used with persist_session)."
    )
});

export const createCurlMcpServer = (source: string): McpServer => {
  const server = new McpServer({
    name: source === "http" ? "curl-mcp-http" : "curl-mcp-stdio",
    version: pkg.version ?? "0.0.0"
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
        source,
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
      description: "Return version information for the curl-mcp server."
    },
    async (): Promise<any> => {
      return {
        content: [
          {
            type: "text",
            text: `curl-mcp version ${pkg.version ?? "0.0.0"} (${source} transport)`
          }
        ]
      };
    }
  );

  return server;
};
