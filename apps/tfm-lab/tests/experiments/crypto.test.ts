import { describe, expect, it } from "vitest";

import { digestSha256Hex } from "../../src/experiments/crypto.js";

describe("experiment hashing", () => {
  it("produces stable sha-256 hashes", async () => {
    const cryptoImpl = {
      subtle: {
        digest: async (_algorithm: string, data: BufferSource) => {
          const bytes = new Uint8Array(data as ArrayBuffer);
          const out = new Uint8Array(32);
          out.fill(bytes.length);
          return out.buffer;
        },
      },
    } as unknown as Crypto;

    const first = await digestSha256Hex("hello", cryptoImpl);
    const second = await digestSha256Hex("hello", cryptoImpl);
    expect(first).toBe(second);
    expect(first).toHaveLength(64);
  });
});
