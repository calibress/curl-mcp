# Roadmap / Improvements

Tracking potential enhancements for curl-mcp. Use this as a lightweight backlog and open issues as needed.

| Area | Improvement | Rationale | Status |
| --- | --- | --- | --- |
| Response Handling | Automatic JSON/Text/Binary detection via `response_type` (`json` \| `text` \| `binary`). | Clarify how non-text bodies (images, binaries) are returned; avoid ambiguity and let callers choose. | Done |
| Error Context | Better error typing/parsing for common network failures (DNS, TCP connect, SSL handshake, timeout). | Return structured error categories instead of only raw messages for easier handling. | Done (basic categories) |
| Request Headers | Default `User-Agent` when none is provided. | Reduce the chance of blocks/CAPTCHAs from servers that reject missing UA. | Done (can override via headers) |
| Follow-up Requests | Optional cookie/redirect persistence for chained calls. | Support multi-step flows (auth/session) without manual cookie management. | Done (opt-in session/redirect flags) |
