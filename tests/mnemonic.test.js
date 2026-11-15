import { describe, expect, it } from "vitest";
import { createMnemonic, checkMnemonic } from "../src/services/mnemonicService.js";

describe("BIP-39 mnemonic service", () => {
  it("generates a valid 12-word phrase", () => {
    const phrase = createMnemonic(12);
    expect(phrase.split(" ")).toHaveLength(12);
    expect(checkMnemonic(phrase).valid).toBe(true);
  });

  it("generates a valid 24-word phrase", () => {
    const phrase = createMnemonic(24);
    expect(phrase.split(" ")).toHaveLength(24);
    expect(checkMnemonic(phrase).valid).toBe(true);
  });

  it("rejects an invalid phrase", () => {
    expect(checkMnemonic("not a valid recovery phrase").valid).toBe(false);
  });
});
