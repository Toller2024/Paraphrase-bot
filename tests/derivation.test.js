import { describe, expect, it } from "vitest";
import { deriveEvmAddress } from "../src/services/derivationService.js";

const TEST_PHRASE = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("EVM derivation", () => {
  it("derives a checksummed EVM address from a valid test mnemonic", () => {
    const result = deriveEvmAddress(TEST_PHRASE);
    expect(result.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(result.path).toBe("m/44'/60'/0'/0/0");
  });
});
