#!/usr/bin/env node
import { createRequire } from "node:module";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const serverUrl = process.env.MCP_URL ?? "http://localhost:3000/mcp";
const version = pkg.version ?? "0.0.0";

const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
const client = new Client({ name: "curl-mcp-smoke", version });

try {
  await client.connect(transport);

  const result = await client.callTool({
    name: "curl_request",
    arguments: {
      url: "https://example.com",
      method: "GET",
      headers: {
        "User-Agent": `curl-mcp-smoke/${version}`
      },
      timeout_seconds: 10
    }
  });

  const contentText = result.content?.[0]?.text;
  if (contentText) {
    const parsed = JSON.parse(contentText);
    console.log(
      `Smoke OK: status=${parsed.response?.status_code} ok=${parsed.ok} timing_ms=${parsed.timing_ms}`
    );
  } else {
    console.log("Smoke OK: received response without text content", result);
  }
} catch (error) {
  console.error("Smoke test failed:", error);
  process.exit(1);
} finally {
  try {
    if (typeof client.close === "function") {
      await client.close();
    }
  } catch (err) {
    console.error("Error closing client:", err);
  }

  try {
    await transport.close();
  } catch (err) {
    console.error("Error closing transport:", err);
  }
}
