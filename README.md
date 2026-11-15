# Paraphrase Bot — Wallet Phrase Research Simulator

A browser-based BIP-39 research simulator. It generates cryptographically random mnemonic phrases, checks their BIP-39 checksum, and derives local addresses for compatibility demonstrations.

## Important safety boundary

This project does not search for existing wallets, test phrases against third-party wallet accounts, check balances, or import phrases into live wallet apps. A phrase being BIP-39-valid only means its words and checksum are well-formed; it does not mean it belongs to an existing wallet or controls funds.

Never enter a real recovery phrase into this simulator. Generated phrases are displayed locally in the browser and should be treated as sensitive credentials even though they are random.

## Features

- Generate 12-word or 24-word English BIP-39 mnemonics using browser cryptographic randomness.
- Validate BIP-39 word membership and checksum locally.
- Derive Bitcoin Legacy (P2PKH), Native SegWit (P2WPKH), and Taproot (P2TR using BIP-86) addresses locally.
- Derive EVM addresses for Ethereum, BNB Smart Chain, and Polygon.
- Derive TRON addresses for TRX and TRC-20 compatibility.
- Select the network/address format in the dashboard; USDT is represented by its host chain (ERC-20, BEP-20, or TRC-20).
- Green status requires both a valid BIP-39 checksum and successful local derivation for the selected network.
- Known-answer tests cover published Bitcoin BIP-44, BIP-84, BIP-86, and Ethereum derivation vectors.
- BIP-39 validation tests cover standard 12-word and 24-word vectors, normalization, unknown words, invalid checksums, unsupported lengths, and empty input.
- Copy a derived public address independently from the recovery phrase; clipboard feedback is shown in the dashboard.
- Generate an individual local test phrase and validate its BIP-39 checksum.
- Derive an address locally for the selected network and display the derivation path.
- Keep generated phrases in the current page state only; do not send phrases to a server or persist them.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Tests and build

```bash
npm test
npm run build
```

## Network notes

- Bitcoin Taproot uses the BIP-86 path `m/86'/0'/0'/0/0` and a key-path P2TR output.
- ETH, BNB Smart Chain (BEP-20), and Polygon use EVM-compatible address derivation.
- USDT is a token, not a blockchain. ERC-20 USDT uses an Ethereum address; BEP-20 USDT uses a BNB Smart Chain address; TRC-20 USDT uses a TRON address.

## Privacy

There is no backend, analytics, phrase upload, phrase database, or balance lookup in this version. Do not deploy this as a service for collecting recovery phrases.
