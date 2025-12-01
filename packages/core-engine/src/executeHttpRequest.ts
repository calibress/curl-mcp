import { createRequire } from "node:module";
import { performance } from "node:perf_hooks";
import { createResponseSkeleton } from "./outputTemplate.js";
import {
  CurlContext,
  CurlRequestInput,
  CurlResponse,
  HttpMethod,
  ResponseType
} from "./types.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version?: string };

const MAX_TIMEOUT_SECONDS = 120;
const DEFAULT_RESPONSE_TYPE: ResponseType = "text";
const DEFAULT_USER_AGENT = `curl-mcp/${pkg.version ?? "0.0.0"}`;

const normalizeMethod = (method: HttpMethod): HttpMethod =>
  method.toUpperCase() as HttpMethod;

const computeSizeBytes = (
  requestBody?: string | null,
  responseBody?: string,
  responseBodyBase64?: string | null
) => {
  const requestSize = requestBody ? Buffer.byteLength(requestBody, "utf8") : 0;
  let responseSize = 0;
  if (responseBody) {
    responseSize = Buffer.byteLength(responseBody, "utf8");
  } else if (responseBodyBase64) {
    responseSize = Buffer.from(responseBodyBase64, "base64").byteLength;
  }
  return requestSize + responseSize;
};

const cookieJar = new Map<string, Map<string, string>>();

const getHostFromUrl = (url: string): string | null => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

const buildCookieHeader = (host: string | null): string | undefined => {
  if (!host) return undefined;
  const jar = cookieJar.get(host);
  if (!jar || jar.size === 0) return undefined;
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
};

const storeCookies = (host: string | null, cookies: string[]) => {
  if (!host || cookies.length === 0) return;
  const jar = cookieJar.get(host) ?? new Map<string, string>();
  for (const c of cookies) {
    const firstPart = c.split(";")[0];
    const [name, ...rest] = firstPart.split("=");
    if (!name || rest.length === 0) continue;
    jar.set(name.trim(), rest.join("=").trim());
  }
  cookieJar.set(host, jar);
};

const clearCookies = (host: string | null | undefined) => {
  if (!host) {
    cookieJar.clear();
    return;
  }
  cookieJar.delete(host);
};

export const executeHttpRequest = async (
  ctx: CurlContext | undefined,
  input: CurlRequestInput
): Promise<CurlResponse> => {
  const method = normalizeMethod(input.method);
  const timeoutSeconds = Math.min(
    Math.max(input.timeout_seconds ?? 30, 1),
    MAX_TIMEOUT_SECONDS
  );
  const timeoutMs = timeoutSeconds * 1000;
  const responseType: ResponseType = input.response_type ?? DEFAULT_RESPONSE_TYPE;
  const host = getHostFromUrl(input.url);
  const sessionCleared = Boolean(input.clear_session);

  const responseShape = createResponseSkeleton(ctx, { ...input, method });

  let responseBody: string | undefined;
  let responseBodyBase64: string | null = null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs);

  try {
    if (sessionCleared) {
      clearCookies(host);
    }

    const headers = { ...(input.headers ?? {}) };
    if (!headers["User-Agent"] && !headers["user-agent"]) {
      headers["User-Agent"] = DEFAULT_USER_AGENT;
    }
    if (input.persist_session) {
      const cookieHeader = buildCookieHeader(host);
      if (cookieHeader && !headers["Cookie"] && !headers["cookie"]) {
        headers["Cookie"] = cookieHeader;
      }
    }

    const redirectMode: RequestRedirect = input.follow_redirects === false ? "manual" : "follow";

    const init: RequestInit = {
      method,
      headers,
      body: input.body ?? undefined,
      signal: controller.signal,
      redirect: redirectMode
    };

    const start = performance.now();
    const res = await fetch(input.url, init);
    const contentType = res.headers.get("content-type") ?? undefined;
    const responseHeaders = Object.fromEntries(res.headers.entries());
    if (responseType === "binary") {
      const buffer = Buffer.from(await res.arrayBuffer());
      responseBodyBase64 = buffer.toString("base64");
      responseBody = undefined;
    } else {
      // Read the body once, then optionally parse JSON to avoid double-read errors.
      const rawText = await res.text();
      if (responseType === "json") {
        try {
          const parsed = JSON.parse(rawText);
          responseBody = JSON.stringify(parsed, null, 2);
        } catch (parseErr) {
          responseBody = rawText;
          responseShape.advice?.push("JSON parse failed; body returned as text.");
        }
      } else {
        responseBody = rawText;
      }
    }

    const timingMs = Math.round(performance.now() - start);

    // Capture cookies if any
    const cookies: string[] = [];
    const headerCookies =
      typeof (res.headers as any).getSetCookie === "function"
        ? (res.headers as any).getSetCookie()
        : res.headers.has("set-cookie")
        ? [res.headers.get("set-cookie") as string]
        : [];
    if (headerCookies) {
      for (const c of headerCookies) {
        if (c) cookies.push(c);
      }
    }
    if (input.persist_session && cookies.length) {
      storeCookies(host, cookies);
    }

    responseShape.ok = res.ok;
    responseShape.code = res.status;
    responseShape.status = res.statusText;
    responseShape.message = res.ok
      ? "Request completed successfully."
      : `Request failed with status ${res.status}.`;
    responseShape.timing_ms = timingMs;
    responseShape.response = {
      status_code: res.status,
      status_text: res.statusText,
      headers: responseHeaders,
      content_type: contentType,
      body: responseBody ?? null,
      body_base64: responseBodyBase64,
      cookies: cookies.length ? cookies : undefined
    };
    if (input.persist_session && cookies.length) {
      responseShape.advice?.push("Cookies returned; persist_session enabled.");
    }
    if (sessionCleared) {
      responseShape.advice?.push("Session cookies cleared before request.");
    }
    if (responseType === "binary" && !contentType) {
      responseShape.advice?.push("Binary response returned without content-type header.");
    }
    if (!res.ok && res.status >= 300 && res.status < 400 && input.follow_redirects === false) {
      responseShape.advice?.push("Redirect captured because follow_redirects=false; check Location header.");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during HTTP request.";
    const errorLower = message.toLowerCase();
    if (errorLower.includes("timed out") || errorLower.includes("abort")) {
      responseShape.error_type = "timeout";
    } else if (errorLower.includes("enotfound") || errorLower.includes("dns")) {
      responseShape.error_type = "dns_error";
    } else if (
      errorLower.includes("econrefused") ||
      errorLower.includes("econnrefused") ||
      errorLower.includes("econnreset")
    ) {
      responseShape.error_type = "connect_error";
    } else if (errorLower.includes("ssl") || errorLower.includes("tls")) {
      responseShape.error_type = "ssl_error";
    } else {
      responseShape.error_type = "network_error";
    }
    responseShape.error_details = message;
    responseShape.ok = false;
    responseShape.code = null;
    responseShape.status = "error";
    responseShape.message = message;
    responseShape.response = {
      error: message
    };
    if (sessionCleared) {
      responseShape.advice?.push("Session cookies cleared before request.");
    }

    if (message.toLowerCase().includes("timed out")) {
      responseShape.advice?.push("Increase timeout_seconds or retry later.");
    } else {
      responseShape.advice?.push("Verify the URL and request parameters.");
    }
  } finally {
    clearTimeout(timeout);
  }

  const responseSizeInput = responseType === "binary" ? undefined : responseBody;
  responseShape.size_bytes = computeSizeBytes(
    input.body ?? null,
    responseType === "binary" ? undefined : responseSizeInput,
    responseBodyBase64
  );

  if (!responseShape.ok && responseShape.advice?.length === 0) {
    responseShape.advice?.push("Inspect response details for next steps.");
  }

  return responseShape;
};
