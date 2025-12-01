export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface CurlContext {
  request_id?: string;
  tenant_id?: string;
  source?: string;
  timestamp?: number;
}

export interface CurlRequestInput {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: string | null;
  timeout_seconds?: number;
  response_type?: ResponseType;
  persist_session?: boolean;
  follow_redirects?: boolean;
  clear_session?: boolean;
}

export interface CurlRequestDetails {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: string | null;
  timeout_seconds?: number;
  response_type?: ResponseType;
  persist_session?: boolean;
  follow_redirects?: boolean;
  clear_session?: boolean;
}

export interface CurlResponseDetails {
  status_code?: number;
  status_text?: string;
  headers?: Record<string, string>;
  content_type?: string;
  body?: string | null;
  body_base64?: string | null;
  error?: string;
  cookies?: string[];
}

export type ResponseType = "text" | "json" | "binary";

export interface CurlResponse {
  ok: boolean;
  code: number | null;
  status: string;
  message: string;
  timing_ms?: number;
  size_bytes?: number;
  request: CurlRequestDetails;
  response: CurlResponseDetails;
  advice?: string[];
  context?: CurlContext;
  error_type?: string;
  error_details?: string;
}
