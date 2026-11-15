import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/ripemd160";
import { base58 } from "@scure/base";
import { HDNodeWallet, SigningKey, getBytes, keccak256 } from "ethers";
import { checkMnemonic } from "./mnemonicService.js";

const PATHS = {
  bitcoinLegacy: "m/44'/0'/0'/0/0",
  bitcoinSegwit: "m/84'/0'/0'/0/0",
  ethereum: "m/44'/60'/0'/0/0",
  tron: "m/44'/195'/0'/0/0",
};

function assertValidPhrase(phrase) {
  const result = checkMnemonic(phrase);
  if (!result.valid) throw new Error("Cannot derive an address from an invalid BIP-39 phrase.");
  return result.normalized;
}

function hash160(bytes) {
  return ripemd160(sha256(bytes));
}

function base58Check(payload) {
  const first = sha256(sha256(payload)).slice(0, 4);
  const combined = new Uint8Array(payload.length + 4);
  combined.set(payload);
  combined.set(first, payload.length);
  return base58.encode(combined);
}

function bech32Polymod(values) {
  const generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= generators[i];
  }
  return chk >>> 0;
}

function expandHrp(hrp) {
  const high = [...hrp].map((c) => c.charCodeAt(0) >>> 5);
  const low = [...hrp].map((c) => c.charCodeAt(0) & 31);
  return [...high, 0, ...low];
}

function convertBits(data, from, to, pad = true) {
  let acc = 0;
  let bits = 0;
  const result = [];
  const maxv = (1 << to) - 1;
  for (const value of data) {
    if (value < 0 || value >>> from) throw new Error("Invalid data for bech32 conversion.");
    acc = (acc << from) | value;
    bits += from;
    while (bits >= to) {
      bits -= to;
      result.push((acc >>> bits) & maxv);
    }
  }
  if (pad) {
    if (bits) result.push((acc << (to - bits)) & maxv);
  } else if (bits >= from || ((acc << (to - bits)) & maxv)) {
    throw new Error("Invalid bech32 padding.");
  }
  return result;
}

function encodeSegwitV0(program) {
  const hrp = "bc";
  const data = [0, ...convertBits(program, 8, 5)];
  const values = [...expandHrp(hrp), ...data, 0, 0, 0, 0, 0, 0];
  const polymod = bech32Polymod(values) ^ 1;
  const checksum = [];
  for (let i = 0; i < 6; i++) checksum.push((polymod >>> (5 * (5 - i))) & 31);
  const alphabet = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
  return hrp + "1" + [...data, ...checksum].map((v) => alphabet[v]).join("");
}

function deriveBitcoin(phrase, format) {
  const normalized = assertValidPhrase(phrase);
  const path = format === "legacy" ? PATHS.bitcoinLegacy : PATHS.bitcoinSegwit;
  const seed = mnemonicToSeedSync(normalized);
  const child = HDKey.fromMasterSeed(seed).derive(path);
  if (!child.publicKey) throw new Error("Bitcoin public key derivation failed.");
  const keyHash = hash160(child.publicKey);
  const address = format === "legacy"
    ? base58Check(new Uint8Array([0, ...keyHash]))
    : encodeSegwitV0(keyHash);
  return {
    address,
    path,
    network: format === "legacy" ? "Bitcoin Legacy (P2PKH)" : "Bitcoin Native SegWit (P2WPKH)",
    note: "Bitcoin mainnet address derived locally; no network lookup or balance check performed.",
  };
}

export function deriveNetworkAddress(phrase, network) {
  const normalized = assertValidPhrase(phrase);
  if (network === "bitcoin-legacy") return deriveBitcoin(normalized, "legacy");
  if (network === "bitcoin-segwit") return deriveBitcoin(normalized, "segwit");

  if (network === "tron") {
    const wallet = HDNodeWallet.fromPhrase(normalized, "", PATHS.tron);
    const uncompressed = getBytes(SigningKey.computePublicKey(wallet.privateKey, false));
    const accountHash = getBytes(keccak256(uncompressed.slice(1))).slice(-20);
    const payload = new Uint8Array(21);
    payload[0] = 0x41;
    payload.set(accountHash, 1);
    return {
      address: base58Check(payload),
      path: PATHS.tron,
      network: "TRON (TRX / TRC-20)",
      note: "TRON mainnet address derived locally; no network lookup or balance check performed.",
    };
  }

  const wallet = HDNodeWallet.fromPhrase(normalized, "", PATHS.ethereum);
  const labels = {
    ethereum: ["Ethereum (ETH / ERC-20)", "Ethereum address format; also used by ERC-20 tokens such as USDT."],
    bsc: ["BNB Smart Chain (BEP-20)", "EVM-compatible address format; also used by BEP-20 tokens such as USDT."],
    polygon: ["Polygon", "EVM-compatible address format."],
  };
  const selected = labels[network];
  if (!selected) throw new Error("Select a supported network.");
  return {
    address: wallet.address,
    path: PATHS.ethereum,
    network: selected[0],
    note: selected[1],
  };
}

export const DERIVATION_PATHS = PATHS;
