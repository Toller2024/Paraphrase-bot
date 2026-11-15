import { describe, expect, it } from "vitest";
import { deriveNetworkAddress } from "./networkDerivationService.js";

const VECTOR = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("network address derivation", () => {
  it("derives an EVM address from a valid BIP-39 phrase", () => {
    const result = deriveNetworkAddress(VECTOR, "ethereum");
    expect(result.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(result.path).toBe("m/44'/60'/0'/0/0");
  });

  it("derives a Bitcoin legacy address", () => {
    const result = deriveNetworkAddress(VECTOR, "bitcoin-legacy");
    expect(result.address).toMatch(/^[1][1-9A-HJ-NP-Za-km-z]{20,}$/);
  });

  it("derives a Bitcoin native SegWit address", () => {
    const result = deriveNetworkAddress(VECTOR, "bitcoin-segwit");
    expect(result.address).toMatch(/^bc1q[0-9a-z]{30,}$/);
  });

  it("derives a TRON mainnet address", () => {
    const result = deriveNetworkAddress(VECTOR, "tron");
    expect(result.address).toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);
  });

  it("rejects an invalid mnemonic", () => {
    expect(() => deriveNetworkAddress("not a real wallet phrase", "tron")).toThrow();
  });
});
