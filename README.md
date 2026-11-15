# Paraphrase Bot — Wallet Phrase Research Simulator

A browser-based **BIP-39 research simulator**. It generates cryptographically random mnemonic phrases, checks their BIP-39 checksum, and derives a local EVM test address for compatibility demonstrations.

## Important safety boundary

This project does **not** search for existing wallets, test phrases against third-party wallet accounts, check balances, or import phrases into live wallet apps. A phrase being BIP-39-valid only means its words and checksum are well-formed; it does not mean it belongs to an existing wallet or controls funds.

Never enter a real recovery phrase into this simulator. Generated phrases are displayed locally in the browser and should be treated as sensitive credentials even though they are random.

## Features

- Generate 12-word or 24-word English BIP-39 mnemonics using browser cryptographic randomness.
- Validate BIP-39 word membership and checksum locally.
- Derive a first Ethereum-compatible address locally (same address format for Ethereum, BNB Smart Chain, and Polygon).
- Keep a session-only count; do not send phrases to a server or persist them.
- Run unit tests for mnemonic generation/validation and address derivation.

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

- ETH, BNB Smart Chain (BEP-20), and Polygon use EVM-compatible address derivation.
- USDT is a token, not a blockchain. ERC-20 USDT uses an Ethereum address; BEP-20 USDT uses a BNB Smart Chain address; TRC-20 USDT uses a TRON address.
- Bitcoin and TRON derivation support are not included in this initial scaffold.

## Privacy

There is no backend, analytics, phrase upload, phrase database, or balance lookup in this version. Do not deploy this as a service for collecting recovery phrases.
