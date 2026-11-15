import { describe, expect, it } from "vitest";
import { deriveNetworkAddress } from "./networkDerivationService.js";

const VECTOR = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("network address derivation", () => {
  it("matches the published Bitcoin legacy known-answer vector", () => {
    const result = deriveNetworkAddress(VECTOR, "bitcoin-legacy");
    expect(result.address).toBe("1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA");
    expect(result.path).toBe("m/44'/0'/0'/0/0");
  });

  it("matches the published BIP-84 native SegWit known-answer vector", () => {
    const result = deriveNetworkAddress(VECTOR, "bitcoin-segwit");
    expect(result.address).toBe("bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu");
    expect(result.path).toBe("m/84'/0'/0'/0/0");
  });

  it("matches the published BIP-86 Taproot known-answer vector", () => {
    const result = deriveNetworkAddress(VECTOR, "bitcoin-taproot");
    expect(result.address).toBe("bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr");
    expect(result.path).toBe("m/86'/0'/0'/0/0");
  });

  it("matches the published Ethereum derivation vector", () => {
    const result = deriveNetworkAddress(VECTOR, "ethereum");
    expect(result.address.toLowerCase()).toBe("0x9858effd232b4033e47d90003d41ec34ecaeda94");
    expect(result.path).toBe("m/44'/60'/0'/0/0");
  });

  it("derives a TRON address in the expected mainnet format", () => {
    const result = deriveNetworkAddress(VECTOR, "tron");
    expect(result.address).toMatch(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);
  });

  it("rejects an invalid mnemonic", () => {
    expect(() => deriveNetworkAddress("not a real wallet phrase", "tron")).toThrow();
  });
});
