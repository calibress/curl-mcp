# @calibress/curl-mcp

curl-mcp is a stdio MCP server for local use with MCP clients. It allows AI agents and tools to call arbitrary HTTP APIs (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) via a single `curl_request` tool, returning structured responses with status, headers, body, timing, and simple advice.

This package exposes a single MCP tool:

- `curl_request` – a structured HTTP client for agents and MCP-aware tooling.

## Installation

Install globally so the `curl-mcp` CLI is on your `PATH`:

```bash
npm install -g @calibress/curl-mcp
```

## Usage

Run the stdio MCP server:

```bash
curl-mcp
```

Then configure your MCP client to start the `curl-mcp` command via its MCP server settings. For JSON-based configs, this typically looks like:

```json
{
  "mcpServers": {
    "curl-mcp": {
      "command": "curl-mcp",
      "args": []
    }
  }
}
```

Refer to your MCP client documentation for the exact configuration format.
