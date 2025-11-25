import { CurlContext, CurlRequestInput, CurlResponse } from "./types.js";

export const createResponseSkeleton = (
  ctx: CurlContext | undefined,
  input: CurlRequestInput
): CurlResponse => ({
  ok: false,
  code: null,
  status: "",
  message: "",
  request: {
    url: input.url,
    method: input.method,
    headers: input.headers,
    body: input.body ?? null,
    timeout_seconds: input.timeout_seconds,
    response_type: input.response_type,
    persist_session: input.persist_session,
    follow_redirects: input.follow_redirects
  },
  response: {},
  advice: [],
  context: ctx ? { ...ctx } : undefined
});
