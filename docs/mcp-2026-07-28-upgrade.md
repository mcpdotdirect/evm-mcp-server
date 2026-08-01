# MCP 2026-07-28 Upgrade

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
  - `@modelcontextprotocol/express` v2
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
- Added MCP OAuth resource-server support for HTTP:
  - localhost can run without authorization
  - non-local binds fail closed unless OAuth is configured
  - authorization-server metadata discovery and RFC 7662 token introspection
  - baseline `mcp`, wallet-write `evm:write`, and signing `evm:sign` scopes
- Configured all static list capabilities with `listChanged: false`; resource subscriptions remain disabled.
- Configured one-hour public cache hints for discovery, static list operations, resource templates, and the public `evm://networks` resource. Unannotated future resources retain conservative cache defaults.
- Migrated MCP-bound schemas to Zod 4 object schemas so the SDK emits JSON Schema 2020-12.
- Added an `outputSchema` to all 25 tools. Every successful tool call returns equivalent JSON in both `structuredContent` and a pretty-printed text content block; bigint values are represented as decimal strings.
- Added native MCP multi-round-trip confirmation to the six wallet-backed operations:
  - `write_contract`
  - `transfer_native`
  - `transfer_erc20`
  - `approve_token_spending`
  - `sign_message`
  - `sign_typed_data`
- Integrity-protected confirmation continuation state with the SDK HMAC codec:
  - binds the complete tool arguments and current HTTP bearer token
  - expires after five minutes
  - is consumed once per process before wallet access
  - rejects tampering, argument changes, cross-token use, and replay
- Bounded `wait_for_transaction` with `timeoutSeconds` from 1 through 90, defaulting to 90 seconds so it returns before the 120-second HTTP transport timeout.
- Kept process diagnostics on `stderr`, including the npm CLI startup line, so stdio `stdout` contains protocol messages only.

## Final-Spec Differences from the RC

The repository no longer carries RC behavior for the following changes:

- `HeaderMismatch` is `-32020`, not `-32001`.
- `UnsupportedProtocolVersion` is `-32022`, not `-32004`.
- `clientInfo` is optional request metadata.
- Server identity is emitted as `_meta.io.modelcontextprotocol/serverInfo` on every modern result, not as `serverInfo` in the `server/discover` result body.
- Request-scoped SSE and `subscriptions/listen` are owned by the official SDK instead of a repository-local transport implementation.

## Compatibility Decisions

- HTTP remains strict `2026-07-28` to preserve the existing modern-only deployment decision.
- Stdio serves both modern and legacy clients because local hosts commonly require gradual negotiation.
- The static tool, prompt, and resource surfaces do not advertise change notifications.
- `wait_for_transaction` remains a bounded synchronous tool. The Tasks extension is not advertised because the released v2 SDK removed its experimental server runtime; the extension currently has no supported TypeScript runtime integration to adopt.
- Wallet-backed operations are not executed until the client accepts the tool's MCP `input_required` confirmation. Prompts and server instructions do not request a second conversational confirmation.
- OAuth is HTTP-only. Stdio continues to obtain wallet and RPC credentials from its environment.

## HTTP OAuth Configuration

The HTTP process acts as an OAuth resource server; it does not issue access tokens. With the default local `MCP_HOST=127.0.0.1`, omitting `MCP_OAUTH_ISSUER_URL` keeps OAuth disabled. Setting it enables OAuth locally. Binding to a non-local interface requires OAuth and aborts startup if the configuration is incomplete.

Required when OAuth is enabled:

- `MCP_OAUTH_ISSUER_URL`: exact HTTPS authorization-server issuer without a query or fragment
- `MCP_PUBLIC_URL`: exact externally reachable MCP endpoint with the `/mcp` path and no query or fragment; non-local deployments require HTTPS
- `MCP_OAUTH_CLIENT_ID`: RFC 7662 introspection client ID
- `MCP_OAUTH_CLIENT_SECRET`: RFC 7662 introspection client secret

Optional overrides:

- `MCP_OAUTH_METADATA_URL`: authorization-server metadata URL; defaults to the RFC 8414 URL derived from the issuer, including correct well-known path insertion for issuers with a path
- `MCP_OAUTH_INTROSPECTION_URL`: introspection endpoint when metadata does not publish `introspection_endpoint`
- `MCP_OAUTH_AUDIENCE`: expected token audience/resource; defaults to `MCP_PUBLIC_URL`
- `MCP_OAUTH_SCOPES`: additional advertised scopes; the minimal built-in `mcp` scope is always advertised
- `MCP_OAUTH_REQUIRED_SCOPES`: additional scopes required for every MCP request; the baseline `mcp` scope is always required

Introspection must return an active token with a client identity, expiration, the expected audience/resource, and appropriate scopes. In addition to the baseline scope, transaction and approval tools require `evm:write`; signing tools require `evm:sign`.

Authorization-server metadata must support the authorization-code response type and PKCE `S256`. The issuer, metadata URL, and every authorization-server endpoint must use HTTPS. Metadata discovery and introspection reject redirects and use a 10-second deadline.

## Verification

The automated MCP integration tests cover:

- final `server/discover` shape and server identity metadata
- optional `clientInfo`
- deterministic tool listing and closed no-argument schemas
- output schemas and structured tool results
- confirmation requests and declines for all six wallet-backed operations, plus shared-helper coverage for argument binding, tamper rejection, and single-use replay prevention
- bounded transaction waiting
- cache hints on discovery, list, and resource results
- resource reads and a read-only tool call
- final `HeaderMismatch` and `UnsupportedProtocolVersion` error codes
- local authorization opt-out, remote fail-closed behavior, OAuth metadata validation, RFC 7662 introspection, audience checks, and scopes

Release checks:

```bash
bunx tsc --noEmit
bun run test:mcp
bun run build
bun run build:http
```

## Follow-up Work

These are enhancements, not compliance blockers:

- Revisit the Tasks extension only after the official SDK provides a released server runtime for the final extension protocol.
- Add deployment-specific rate limiting, audit logging, secret management, and authorization-server operational guidance before hosting a shared production endpoint.
