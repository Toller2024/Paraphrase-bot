import { generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

function secureRandomBytes(length) {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure browser randomness is unavailable.");
  }
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function createMnemonic(wordCount = 12) {
  if (wordCount !== 12 && wordCount !== 24) {
    throw new Error("Choose either 12 or 24 words.");
  }
  const entropyBytes = wordCount === 12 ? 16 : 32;
  return generateMnemonic(wordlist, entropyBytes * 8, secureRandomBytes);
}

export function checkMnemonic(phrase) {
  const normalized = String(phrase ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  const words = normalized ? normalized.split(" ") : [];
  const wordCountValid = words.length === 12 || words.length === 24;
  const allWordsKnown = wordCountValid && words.every((word) => wordlist.includes(word));
  const checksumValid = allWordsKnown && validateMnemonic(normalized, wordlist);
  return {
    normalized,
    wordCount: words.length,
    wordCountValid,
    allWordsKnown,
    checksumValid,
    valid: Boolean(checksumValid),
  };
}
