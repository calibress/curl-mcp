# curl-mcp

`curl-mcp` is an open-source HTTP/cURL tool for the **Model Context Protocol (MCP)**.

It provides a single tool:

> **`curl_request` – a structured HTTP client designed for AI assistants and MCP-aware development tools.**

This server is intended for use with **any MCP-compatible client**, such as:

- ChatGPT Desktop  
- Roo Code  
- Cursor  
- Cline  
- Continue.dev  
- Custom MCP agents

No client-specific configuration examples are included here — each MCP client provides its own method for adding local MCP servers.  
**You simply run `curl-mcp`, then register it inside your client.**

---

## ✨ Features

- 🔌 **MCP stdio server**  
  Run locally and expose the `curl_request` tool to any MCP client.

- 🧰 **Full HTTP support**  
  Supports `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.

- 🧱 **Structured JSON responses**  
  Includes:
  - HTTP status code  
  - status text  
  - headers  
  - raw text body  
  - timing metrics  
  - total size  
  - simple advice messages  

- 🕒 **Timeout & network error handling**  
  Uses `AbortController` under the hood.

- 🧪 **Integration-test friendly**  
  Includes a self-describing JSON test file for humans or AI agents.

---

## 📦 Installation (from source)

```bash
npm install
npm run build
```

---

## ▶️ Running the MCP server

Start the stdio MCP server:

```bash
npm run dev:stdio
```

This launches the `curl-mcp` MCP server on stdio.  
Your MCP client should then be configured (via its own UI or config system) to run that command.

> **Important:**  
> MCP clients each have their own method of adding a local MCP server.  
> Please refer to your client’s documentation for how to register a local command.

---

## 🛠 Tool: `curl_request`

### Input (schema overview)

```json
{
  "url": "string",
  "method": "GET | POST | PUT | PATCH | DELETE | HEAD | OPTIONS",
  "headers": { "Header-Name": "value" },
  "body": "string or null",
  "timeout_seconds": 1,
  "response_type": "text | json | binary (optional; default text)",
  "persist_session": "boolean (optional; keep cookies in-memory for chained calls)",
  "follow_redirects": "boolean (optional; default true)"
}
```

### Output (schema overview)

```json
{
  "ok": true,
  "code": 200,
  "status": "OK",
  "message": "Request completed successfully.",
  "timing_ms": 123,
  "size_bytes": 4096,
  "request": { ... },
  "response": {
    "status_code": 200,
    "status_text": "OK",
    "headers": { ... },
    "body": "<raw text body>",
    "body_base64": "<base64 when response_type=binary>",
    "cookies": ["set-cookie if present"]
  },
  "advice": [],
  "error_type": "timeout | dns_error | connect_error | ssl_error | network_error (when applicable)",
  "error_details": "raw error message when applicable"
}
```

Notes:
- Default `User-Agent` is injected if none is provided (`curl-mcp/<version>`); override via headers if needed.
- `response_type` defaults to text. Use `json` to parse/pretty-print JSON, `binary` for base64 + content-type/size metadata.
- `persist_session` is opt-in and keeps cookies in-memory for chained calls; `follow_redirects` can be turned off to capture redirect responses.

---

## 🧪 Integration Tests

The file:

```
docs/integration-tests.json
```

contains human- and AI-readable integration scenarios such as:

- simple GET
- POST echo
- header round-trip
- timeout behaviour
- error handling
- joke/cat/dog APIs
- NASA APOD
- Weather data for London

These can be executed manually or by an MCP client/agent using `curl_request`.

---

## 📁 Public Project Structure

```text
packages/
  core-engine/      # HTTP engine (fetch wrapper, response shaping)
  mcp-stdio/        # stdio MCP server exposing curl_request
docs/
  integration-tests.json
```

---

## 🖥 Requirements

- **Node.js 20 or later** (native `fetch` support)

---

## 🧭 Roadmap

- Optional binary/base64 response mode
- Optional JSON parse mode
- Richer advice metadata
- Simple test runner script
- Packaging for npm / Homebrew

---

## 📄 License

MIT
