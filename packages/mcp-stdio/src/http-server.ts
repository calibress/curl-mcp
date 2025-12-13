import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createCurlMcpServer } from "./serverFactory.js";

const PORT = Number(process.env.MCP_PORT ?? process.env.PORT ?? 3000);
const REQUIRE_KEY = (process.env.MCP_REQUIRE_KEY ?? "").toLowerCase() === "true";
const EXECUTOR_SHARED_SECRET = process.env.CURL_MCP_EXECUTOR_SHARED_SECRET;
const EXECUTOR_SHARED_SECRET_HEADER = "x-calibress-executor-secret";
const API_KEYS = (process.env.MCP_API_KEYS ?? "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);
const ALLOWED_HOSTS = (process.env.MCP_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = (process.env.MCP_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const transports = new Map<string, StreamableHTTPServerTransport>();
const servers = new Map<string, McpServer>();

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "4mb" }));
app.use(
  cors({
    origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : "*",
    exposedHeaders: ["mcp-session-id", "Mcp-Session-Id"]
  })
);

const reject = (res: express.Response, status: number, message: string) => {
  res.status(status).json({
    jsonrpc: "2.0",
    error: { code: -32000, message },
    id: null
  });
};

const executorSecretMiddleware: express.RequestHandler = (req, res, next) => {
  if (!EXECUTOR_SHARED_SECRET) return next();
  const candidate = req.header(EXECUTOR_SHARED_SECRET_HEADER);
  if (candidate && candidate === EXECUTOR_SHARED_SECRET) return next();
  return reject(res, 401, "Unauthorized.");
};

const authMiddleware: express.RequestHandler = (req, res, next) => {
  if (!REQUIRE_KEY) return next();
  if (API_KEYS.length === 0) return reject(res, 401, "API key required but none configured.");

  const authHeader = req.headers["authorization"];
  const apiKeyHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const bearer = apiKeyHeader?.startsWith("Bearer ") ? apiKeyHeader.slice(7) : undefined;
  const keyCandidate = bearer || apiKeyHeader || (Array.isArray(req.headers["x-api-key"]) ? req.headers["x-api-key"][0] : req.headers["x-api-key"]);

  if (keyCandidate && API_KEYS.includes(String(keyCandidate))) {
    return next();
  }

  return reject(res, 401, "Unauthorized: invalid API key.");
};

const hostOriginMiddleware: express.RequestHandler = (req, res, next) => {
  if (ALLOWED_HOSTS.length) {
    const hostHeader = req.headers["host"];
    const hostValue = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    if (!hostValue || !ALLOWED_HOSTS.includes(hostValue)) {
      return reject(res, 403, "Forbidden: host not allowed.");
    }
  }
  if (ALLOWED_ORIGINS.length) {
    const originHeader = req.headers["origin"];
    const originValue = Array.isArray(originHeader) ? originHeader[0] : originHeader;
    if (!originValue || !ALLOWED_ORIGINS.includes(originValue)) {
      return reject(res, 403, "Forbidden: origin not allowed.");
    }
  }
  return next();
};

const createSession = () => {
  const server = createCurlMcpServer("http");
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId: string) => {
      transports.set(sessionId, transport);
      servers.set(sessionId, server);
    },
    allowedHosts: ALLOWED_HOSTS.length ? ALLOWED_HOSTS : undefined,
    allowedOrigins: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : undefined,
    enableDnsRebindingProtection: ALLOWED_HOSTS.length > 0 || ALLOWED_ORIGINS.length > 0
  });
  transport.onclose = () => {
    const sessionId = transport.sessionId;
    if (sessionId) {
      transports.delete(sessionId);
      servers.delete(sessionId);
    }
  };
  return { server, transport };
};

const extractSessionId = (header: string | string[] | undefined): string | undefined => {
  if (Array.isArray(header)) return header[0];
  return header;
};

app.post("/mcp", executorSecretMiddleware, authMiddleware, hostOriginMiddleware, async (req, res) => {
  const sessionIdHeader = extractSessionId(req.headers["mcp-session-id"]);

  try {
    if (sessionIdHeader && transports.has(sessionIdHeader)) {
      const transport = transports.get(sessionIdHeader)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (!isInitializeRequest(req.body)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: start with initialize to open a session."
        },
        id: null
      });
      return;
    }

    const { server, transport } = createSession();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error"
        },
        id: null
      });
    }
  }
});

app.get("/mcp", executorSecretMiddleware, authMiddleware, hostOriginMiddleware, async (req, res) => {
  const sessionIdHeader = extractSessionId(req.headers["mcp-session-id"]);
  if (!sessionIdHeader || !transports.has(sessionIdHeader)) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  try {
    const transport = transports.get(sessionIdHeader)!;
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling MCP GET request:", error);
    if (!res.headersSent) {
      res.status(500).send("Error processing request");
    }
  }
});

app.delete("/mcp", executorSecretMiddleware, authMiddleware, hostOriginMiddleware, async (req, res) => {
  const sessionIdHeader = extractSessionId(req.headers["mcp-session-id"]);
  if (!sessionIdHeader || !transports.has(sessionIdHeader)) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  try {
    const transport = transports.get(sessionIdHeader)!;
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling MCP DELETE request:", error);
    if (!res.headersSent) {
      res.status(500).send("Error processing session termination");
    }
  }
});

const httpServer = app.listen(PORT, (error?: unknown) => {
  if (error) {
    console.error("Failed to start HTTP server:", error);
    process.exit(1);
  }
  console.log(`curl-mcp HTTP server listening on port ${PORT}`);
});

const shutdown = async () => {
  console.log("Shutting down curl-mcp HTTP server...");
  httpServer.close();
  await Promise.all(
    Array.from(transports.values()).map(async (transport) => {
      try {
        await transport.close();
      } catch (err) {
        console.error("Error closing transport:", err);
      }
    })
  );
  transports.clear();
  servers.clear();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
