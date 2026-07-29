# MCP 2026-07-28 Upgrade

Branch: `ccbbccbb/mcp-2026-07-28-upgrade`

This repository targets the final MCP `2026-07-28` specification through the released TypeScript SDK v2 packages. The release-candidate compatibility adapter has been removed.

## Authoritative Sources

- Specification: https://modelcontextprotocol.io/specification/2026-07-28
- Changelog: https://modelcontextprotocol.io/specification/2026-07-28/changelog
- SDK v1-to-v2 migration: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/upgrade-to-v2.md
- SDK `2026-07-28` support: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/migration/support-2026-07-28.md

## Final Alignment

- Replaced `@modelcontextprotocol/sdk` v1 with:
  - `@modelcontextprotocol/server` v2
  - `@modelcontextprotocol/node` v2
  - Zod v4.2 or newer
- Replaced the local JSON-RPC adapter with SDK-native `createMcpHandler` and `serveStdio`.
- Kept stdio dual-era:
  - MCP `2026-07-28` through `server/discover`
  - MCP `2025-11-25` through the legacy `initialize` handshake
- Kept HTTP modern-only and stateless:
  - one `POST /mcp` request per exchange
  - no `Mcp-Session-Id`
  - request-scoped JSON or SSE responses
- Added SDK-provided validation for the final standard headers:
  - `MCP-Protocol-Version`
  - `Mcp-Method`
  - `Mcp-Name`
- Added Host and Origin validation before the HTTP MCP handler.
- Configured all static list capabilities with `listChanged: false`; resource subscriptions remain disabled.
- Configured one-hour public cache hints for discovery, list operations, resource templates, and resource reads.
- Migrated MCP-bound schemas to Zod 4 object schemas so the SDK emits JSON Schema 2020-12.
- Kept process diagnostics on `stderr`, including the npm CLI startup line, so stdio `stdout` contains protocol messages only.

## Final-Spec Differences from the RC

The repository no longer carries RC behavior for the following changes:

- `HeaderMismatch` is `-32020`, not `-32001`.
- `UnsupportedProtocolVersion` is `-32022`, not `-32004`.
- `clientInfo` is optional request metadata.
- Server identity is emitted as `_meta.io.modelcontextprotocol/serverInfo` on every modern result, not as `serverInfo` in the `server/discover` result body.
- Request-scoped SSE and `subscriptions/listen` are owned by the official SDK instead of a repository-local transport implementation.

## Compatibility Decisions

- HTTP remains strict `2026-07-28` to preserve the RC branch's modern-only deployment decision.
- Stdio serves both modern and legacy clients because local hosts commonly require gradual negotiation.
- The static tool, prompt, and resource surfaces do not advertise change notifications.
- `wait_for_transaction` remains a normal synchronous tool. The Tasks extension is not advertised.
- The server does not implement MCP OAuth. It uses environment-configured RPC and wallet credentials.

## Verification

The automated MCP integration tests cover:

- final `server/discover` shape and server identity metadata
- optional `clientInfo`
- deterministic tool listing and closed no-argument schemas
- cache hints on discovery, list, and resource results
- resource reads and a read-only tool call
- final `HeaderMismatch` and `UnsupportedProtocolVersion` error codes

Release checks:

```bash
bunx tsc --noEmit
bun run test:mcp
bun run build
bun run build:http
```

## Follow-up Work

These are enhancements, not compliance blockers:

- Add `outputSchema` and `structuredContent` to high-value read tools while preserving text content for older clients.
- Adopt the Tasks extension only if transaction confirmation regularly exceeds practical request timeouts.
- Add MCP OAuth before exposing wallet-backed write tools through a shared remote deployment.
