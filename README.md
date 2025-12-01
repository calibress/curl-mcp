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

- 🔌 **MCP transports**  
  Stdio for local dev and an Express-based HTTP server for hosted clients.

- 🧰 **Full HTTP support**  
  Supports `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.

- 🧱 **Structured responses**  
  Status, headers, content-type, timing, size, body (text/pretty JSON/base64), advice.

- 🍪 **Session & redirect control**  
  In-memory cookie jar per host (`persist_session`), `follow_redirects` toggle, `clear_session` helper.

- 🕒 **Timeout & network handling**  
  Abort controller with error typing: timeout, DNS, connect, SSL, generic network.

- 🧪 **Integration-test friendly**  
  Self-describing JSON scenarios in `docs/integration-tests.json`.

---

## 🚀 Quick Start

- From source (local clone):
  ```bash
  npm install
  npm run dev:stdio   # stdio transport
  npm run dev:http    # HTTP transport (default: http://localhost:3000/mcp)
  ```

- From CLI (installed):
  ```bash
  brew install calibress/mcp/curl-mcp    # or: npm install -g @calibress/curl-mcp
  curl-mcp             # stdio
  curl-mcp --http      # HTTP (set PORT or MCP_PORT to change 3000)
  ```

Then point your MCP client at the command you use (see configs below).

---

## 📦 Installation (from source)

```bash
npm install
npm run build
```

---

## ▶️ Running the MCP server

You can run `curl-mcp` either directly from this source repo, or via an installed CLI on your `PATH`.

**From source (local clone)**

From the root of your local `curl-mcp` clone:

```bash
npm run dev:stdio
```

This launches the `curl-mcp` MCP server on stdio.  
Configure your MCP client to run that same command in the repo directory.  
Some clients let you set the working directory explicitly; others work better if you pass a `--prefix` pointing at your clone.  
For example, an `mcpServers` JSON block might look like:

```json
{
  "mcpServers": {
    "curl-mcp": {
      "command": "npm",
      "args": [
        "--prefix",
        "/PATH/TO/YOUR/curl-mcp",
        "run",
        "dev:stdio"
      ]
    }
  }
}
```

Make sure the working directory for the command is the root of your local `curl-mcp` clone.

**From CLI (`curl-mcp` on PATH)**

If `curl-mcp` is on your `PATH` (for example via Homebrew or npm), point your MCP client at it directly without using `npm run`:

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

> **Important:**  
> MCP clients each have their own method of adding a local MCP server and choosing the working directory.  
> Use the examples above as a guide, but refer to your client’s documentation for the exact configuration format.

**HTTP transport (Express)**

Start the HTTP server:

```bash
# from source
npm run dev:http
# or from the installed CLI
curl-mcp --http
```

Port and hardening (optional):

- Port: defaults to 3000; override with `PORT` or `MCP_PORT` (e.g., `PORT=3400 npm run dev:http`).
- MCP client config should match the server port, e.g. `"url": "http://localhost:3400/mcp"`.
- If the port is in use, pick another free port and reflect it in the URL (some clients let you set host/port separately; otherwise include the port in the URL).
- Auth/allowlist (default: off). Opt in via env vars:
  - `MCP_REQUIRE_KEY=true` and `MCP_API_KEYS=key1,key2` (checks `Authorization: Bearer <key>` or `X-API-Key`)
  - `MCP_ALLOWED_HOSTS=host:port,otherhost:port` (Host header check)
  - `MCP_ALLOWED_ORIGINS=https://yourapp.com` (Origin check + CORS allowlist)
  If unset, the server stays open for local/dev use.

Point your MCP client at the HTTP endpoint (default `http://localhost:3000/mcp`):

```json
{
  "mcpServers": {
    "curl-mcp": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## 🔍 Smoke test (HTTP)

1) Start the HTTP server: `npm run dev:http` (or `curl-mcp --http`).
2) Run the smoke script: `npm run smoke:http` (set `MCP_URL` to override the endpoint).
3) You should see a one-line summary with the returned status/timing.

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
"persist_session": "boolean (optional; per-host cookie jar for chained calls)",
"follow_redirects": "boolean (optional; default true; set false to capture redirect + cookies)",
"clear_session": "boolean (optional; clear stored cookies for this host before the request)"
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
    "content_type": "<content-type header, if present>",
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
- `response_type` defaults to text. Use `json` to parse/pretty-print JSON, `binary` for base64 + content-type/size metadata (exposed via `response.content_type`).
- `persist_session` keeps cookies in-memory per host for chained calls; `follow_redirects=false` lets you capture the redirect + Set-Cookie; `clear_session` wipes cookies for the host before issuing the request.
- Bodies are allowed on any verb (useful for APIs that accept GET with bodies).

Common headers example:

```json
{
  "User-Agent": "curl-mcp/0.0.5",
  "Accept": "application/json",
  "Content-Type": "application/json"
}
```

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
- timeout and error handling
- redirects on/off
- cookies + session reuse + clearing
- binary base64 + content-type
- JSON parse fallback
- joke/cat/dog APIs
- NASA APOD
- Weather data for London

These can be executed manually or by an MCP client/agent using `curl_request`.

---

## 📁 Public Project Structure

```text
packages/
  core-engine/      # HTTP engine (fetch wrapper, response shaping)
  mcp-stdio/        # stdio + Express HTTP transports exposing curl_request
docs/
  integration-tests.json
```

---

## 🖥 Requirements

- **Node.js 20 or later** (native `fetch` support)

---

## 🧭 Roadmap

- HTTP auth options (API key/bearer) for hosted deployments
- Lightweight metrics/logging switch
- More ready-made smoke/health checks
- Packaging and publishing updates

---

## 📄 License

MIT
