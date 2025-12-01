import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCurlMcpServer } from "./serverFactory.js";

const server = createCurlMcpServer("stdio");

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
