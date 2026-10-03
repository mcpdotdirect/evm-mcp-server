import { describe, expect, spyOn, test } from "bun:test";
import type { WalletClient } from "viem";
import * as clients from "../src/core/services/clients.js";
import { approveERC20, parseExactAmount, prepareERC20Amount, transferERC20 } from "../src/core/services/transfer.js";

describe("Exact operation amounts", () => {
  test("rejects rounding, malformed amounts and uint256 overflow", () => {
    for (const value of ["0.0000006", "0.0000004", "1.0000006"]) {
      expect(() => parseExactAmount(value, 6)).toThrow("rounding is not allowed");
    }
    for (const value of ["-1", "1e6", "NaN", "", " 1", "1."]) {
      expect(() => parseExactAmount(value, 18)).toThrow("non-negative decimal");
    }
    expect(() => parseExactAmount((2n ** 256n).toString(), 0)).toThrow("uint256");
    expect(parseExactAmount("0", 6)).toBe(0n);
    expect(parseExactAmount("1.2300000", 6)).toBe(1230000n);
    expect(parseExactAmount("0.000000000000000001", 18)).toBe(1n);
    expect(parseExactAmount("2.000", 0)).toBe(2n);
  });

  test("transfers and approvals execute prepared base units without re-reading decimals", async () => {
    const token = "0x0000000000000000000000000000000000000001";
    const recipient = "0x0000000000000000000000000000000000000002";
    const key = `0x${"0".repeat(63)}1` as const;
    const hash = `0x${"1".repeat(64)}` as const;
    const reads = spyOn(clients.getPublicClient(), "readContract").mockResolvedValue(6);
    const sent: unknown[][] = [];
    const wallet = spyOn(clients, "getWalletClient").mockReturnValue({
      account: { address: recipient },
      chain: { id: 1 },
      writeContract: async ({ args }: { args: unknown[] }) => {
        sent.push(args);
        return hash;
      }
    } as unknown as WalletClient);
    try {
      const amount = await prepareERC20Amount(token, "1.000001");
      expect(amount.raw).toBe(1000001n);
      reads.mockClear();
      reads.mockResolvedValue("TEST");
      const transfer = await transferERC20(token, recipient, amount, key);
      await approveERC20(token, recipient, amount, key);
      expect(sent).toEqual([[recipient, 1000001n], [recipient, 1000001n]]);
      expect(transfer.amount).toEqual({ raw: 1000001n, formatted: "1.000001" });
      expect(reads).toHaveBeenCalledTimes(1);
      expect(reads.mock.calls[0][0].functionName).toBe("symbol");
    } finally {
      reads.mockRestore();
      wallet.mockRestore();
    }
  });
});
