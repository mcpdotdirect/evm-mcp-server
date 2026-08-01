import {
  createRequestStateCodec,
  type ServerContext
} from "@modelcontextprotocol/server";

const CONFIRMATION_STATE_TTL_SECONDS = 5 * 60;
const requestStateKey = crypto.getRandomValues(new Uint8Array(32));
const consumedConfirmationNonces = new Map<string, number>();

export type ConfirmationRequestState = {
  purpose: "wallet-operation-confirmation";
  operationDigest: string;
  nonce: string;
  expiresAt: number;
};

function randomHex(byteLength: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(byteLength)))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function pruneConsumedConfirmationNonces(now: number): void {
  for (const [nonce, expiresAt] of consumedConfirmationNonces) {
    if (expiresAt <= now) {
      consumedConfirmationNonces.delete(nonce);
    }
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalize(nestedValue)])
    );
  }

  return value;
}

/**
 * HMAC-protect MCP request state and bind it to the current request and bearer token.
 * A process-local random key intentionally invalidates pending confirmations on restart.
 */
export const confirmationRequestStateCodec =
  createRequestStateCodec<ConfirmationRequestState>({
    key: requestStateKey,
    ttlSeconds: CONFIRMATION_STATE_TTL_SECONDS,
    bind: ctx => [
      ctx.mcpReq.method,
      ctx.http?.authInfo?.token ?? "local-or-stdio"
    ].join("\0")
  });

export async function createOperationDigest(
  toolName: string,
  argumentsValue: Record<string, unknown>
): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(canonicalize({
    toolName,
    arguments: argumentsValue
  })));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
  return Array.from(digest)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function mintConfirmationRequestState(
  operationDigest: string,
  ctx: ServerContext
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  pruneConsumedConfirmationNonces(now);

  return confirmationRequestStateCodec.mint({
    purpose: "wallet-operation-confirmation",
    operationDigest,
    nonce: randomHex(16),
    expiresAt: now + CONFIRMATION_STATE_TTL_SECONDS
  }, ctx);
}

export function isConfirmationRequestState(
  value: unknown
): value is ConfirmationRequestState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<ConfirmationRequestState>;
  return state.purpose === "wallet-operation-confirmation"
    && typeof state.operationDigest === "string"
    && typeof state.nonce === "string"
    && typeof state.expiresAt === "number";
}

/**
 * Mark a verified confirmation as consumed before executing its operation.
 * This prevents a signed confirmation from being replayed within this process.
 */
export function consumeConfirmationRequestState(
  state: ConfirmationRequestState
): boolean {
  const now = Math.floor(Date.now() / 1000);
  pruneConsumedConfirmationNonces(now);

  if (state.expiresAt <= now || consumedConfirmationNonces.has(state.nonce)) {
    return false;
  }

  consumedConfirmationNonces.set(state.nonce, state.expiresAt);
  return true;
}
