import { describe, expect, it, vi } from "vitest";
import { checkMnemonic, createMnemonic } from "./mnemonicService.js";

const VALID_12 = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const VALID_24 = Array(23).fill("abandon").concat("art").join(" ");

describe("BIP-39 mnemonic validation", () => {
  it("accepts the standard 12-word zero-entropy test vector", () => {
    const result = checkMnemonic(VALID_12);
    expect(result.wordCount).toBe(12);
    expect(result.wordCountValid).toBe(true);
    expect(result.allWordsKnown).toBe(true);
    expect(result.checksumValid).toBe(true);
    expect(result.valid).toBe(true);
  });

  it("accepts the standard 24-word zero-entropy test vector", () => {
    const result = checkMnemonic(VALID_24);
    expect(result.wordCount).toBe(24);
    expect(result.wordCountValid).toBe(true);
    expect(result.allWordsKnown).toBe(true);
    expect(result.checksumValid).toBe(true);
    expect(result.valid).toBe(true);
  });

  it("normalizes uppercase words and repeated whitespace", () => {
    const result = checkMnemonic("  ABANDON   ".concat("abandon ".repeat(10), "about  "));
    expect(result.normalized).toBe(VALID_12);
    expect(result.valid).toBe(true);
  });

  it("rejects a phrase with known words but an invalid checksum", () => {
    const result = checkMnemonic(Array(12).fill("abandon").join(" "));
    expect(result.wordCountValid).toBe(true);
    expect(result.allWordsKnown).toBe(true);
    expect(result.checksumValid).toBe(false);
    expect(result.valid).toBe(false);
  });

  it("rejects words that are not in the English BIP-39 list", () => {
    const result = checkMnemonic("notarealword ".concat("abandon ".repeat(10), "about"));
    expect(result.allWordsKnown).toBe(false);
    expect(result.valid).toBe(false);
  });

  it("rejects unsupported word counts", () => {
    const result = checkMnemonic("abandon ".repeat(11));
    expect(result.wordCount).toBe(11);
    expect(result.wordCountValid).toBe(false);
    expect(result.valid).toBe(false);
  });

  it("handles empty and null input safely", () => {
    expect(checkMnemonic("").valid).toBe(false);
    expect(checkMnemonic(null).valid).toBe(false);
  });
});


describe("secure BIP-39 phrase generation", () => {
  it("generates valid 12-word and 24-word English mnemonics", () => {
    const originalCrypto = globalThis.crypto;
    const mockCrypto = {
      getRandomValues(bytes) {
        bytes.fill(0);
        return bytes;
      },
    };
    vi.stubGlobal("crypto", mockCrypto);
    try {
      for (const count of [12, 24]) {
        const phrase = createMnemonic(count);
        const result = checkMnemonic(phrase);
        expect(phrase.split(" ")).toHaveLength(count);
        expect(result.valid).toBe(true);
        expect(result.allWordsKnown).toBe(true);
        expect(result.checksumValid).toBe(true);
      }
    } finally {
      vi.unstubAllGlobals();
      if (originalCrypto) vi.stubGlobal("crypto", originalCrypto);
    }
  });

  it("refuses to generate when secure browser randomness is unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    try {
      expect(() => createMnemonic(12)).toThrow("Secure browser randomness is unavailable.");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects unsupported phrase lengths", () => {
    expect(() => createMnemonic(15)).toThrow("Choose either 12 or 24 words.");
  });
});
