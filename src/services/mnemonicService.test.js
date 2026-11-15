import { describe, expect, it } from "vitest";
import { checkMnemonic } from "./mnemonicService.js";

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
