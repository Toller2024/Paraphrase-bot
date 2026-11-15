import { useMemo, useState } from "react";
import { createMnemonic, checkMnemonic } from "./services/mnemonicService.js";
import { deriveNetworkAddress } from "./services/networkDerivationService.js";

export default function App() {
  const [wordCount, setWordCount] = useState(12);
  const [phrase, setPhrase] = useState("");
  const [network, setNetwork] = useState("ethereum");
  const [generated, setGenerated] = useState(0);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const validation = useMemo(() => checkMnemonic(phrase), [phrase]);
  const derived = useMemo(() => {
    if (!validation.valid) return null;
    try { return deriveNetworkAddress(phrase, network); } catch { return null; }
  }, [phrase, network, validation.valid]);
  const fullyVerified = validation.valid && Boolean(derived);
  const compatibleAddresses = useMemo(() => {
    if (!validation.valid) return [];
    return ["bitcoin-legacy", "bitcoin-segwit", "bitcoin-taproot", "ethereum", "bsc", "polygon", "tron"].flatMap((networkId) => {
      try { return [deriveNetworkAddress(phrase, networkId)]; } catch { return []; }
    });
  }, [phrase, validation.valid]);

  function generate() {
    try {
      setPhrase(createMnemonic(wordCount));
      setGenerated((count) => count + 1);
      setError("");
      setCopyMessage("");
    } catch (err) {
      setError(err.message || "Generation failed.");
    }
  }



  async function copyValue(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} copied to clipboard.`);
      setError("");
    } catch {
      setError("Clipboard access was blocked by the browser.");
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-mark">PB</div>
        <div><strong>PARAPHRASE BOT</strong><span>LOCAL WALLET PHRASE RESEARCH</span></div>
        <span className="local-pill">● LOCAL ONLY</span>
      </header>
      <section className="hero">
        <p className="eyebrow">BIP-39 COMPATIBILITY LAB</p>
        <h1>Generate. Validate.<br /><em>Understand.</em></h1>
        <p className="intro">A local research simulator for generating cryptographically random mnemonic phrases, validating their checksum, and demonstrating address derivation.</p>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">01 / CONFIGURATION</p><h2>Phrase generator</h2></div><span className="counter">{generated} generated this session</span></div>
        <label className="field-label" htmlFor="word-count">MNEMONIC LENGTH</label>
        <select id="word-count" value={wordCount} onChange={(event) => setWordCount(Number(event.target.value))}>
          <option value={12}>12 words · 128-bit entropy</option>
          <option value={24}>24 words · 256-bit entropy</option>
        </select>
        <button className="primary" onClick={generate}>Generate secure phrase <span>↗</span></button>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">03 / MNEMONIC OUTPUT</p><h2>Recovery phrase</h2></div><span className="tag">BIP-39 ENGLISH</span></div>
        <div className="phrase-box">
          {phrase ? phrase.split(" ").map((word, index) => <span className="word" key={index}><small>{String(index + 1).padStart(2, "0")}</small>{word}</span>) : <p className="placeholder">Generate a phrase to display its words here.</p>}
        </div>
        <div className="actions">
          <button className="secondary" disabled={!phrase} onClick={() => copyValue(phrase, "Recovery phrase")}>Copy phrase</button>
          <button className="secondary" disabled={!phrase} onClick={() => { setPhrase(""); setCopyMessage(""); setError(""); }}>Clear</button>
        </div>
        {copyMessage && <p className="copy-message">{copyMessage}</p>}
        {error && <p className="error">{error}</p>}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">04 / LOCAL VALIDATION</p><h2>Compatibility checks</h2></div><span className={fullyVerified ? "status good" : "status"}>{fullyVerified ? "VALID + DERIVED" : validation.valid ? "DERIVATION FAILED" : "NOT VALIDATED"}</span></div>
        <label className="field-label" htmlFor="network-select">ADDRESS NETWORK</label>
        <select id="network-select" value={network} onChange={(event) => setNetwork(event.target.value)}>
          <option value="bitcoin-legacy">Bitcoin · Legacy (P2PKH)</option>
          <option value="bitcoin-segwit">Bitcoin · Native SegWit (P2WPKH)</option>
          <option value="bitcoin-taproot">Bitcoin · Taproot (P2TR / BIP-86)</option>
          <option value="ethereum">Ethereum · ERC-20</option>
          <option value="bsc">BNB Smart Chain · BEP-20</option>
          <option value="polygon">Polygon</option>
          <option value="tron">TRON · TRC-20</option>
        </select>
        <div className="checks">
          <Check label="Word count" ok={validation.wordCountValid} />
          <Check label="Words in BIP-39 list" ok={validation.allWordsKnown} />
          <Check label="BIP-39 checksum" ok={validation.checksumValid} />
          <Check label="Selected network address derivation" ok={fullyVerified} />
        </div>
        {derived && <div className="address-card"><p className="eyebrow">{derived.network} ADDRESS · {derived.path}</p><code>{derived.address}</code><div className="actions"><button className="secondary" onClick={() => copyValue(derived.address, "Public address")}>Copy address</button></div><p>{derived.note}</p></div>}
        {phrase && validation.valid && <div className="compatibility-list"><p className="eyebrow">OTHER SUPPORTED DERIVATION FORMATS</p>{compatibleAddresses.map((item) => <div className="compatibility-row" key={item.network + item.path}><div><strong>{item.network}</strong><small>{item.path}</small></div><code>{item.address}</code><button className="secondary" onClick={() => copyValue(item.address, item.network + " address")}>Copy</button></div>)}</div>}
        {phrase && validation.valid && <WalletCompatibility addresses={compatibleAddresses} />}
      </section>
      <aside className="notice"><strong>Research safety notice</strong><p>Green means the BIP-39 phrase passes its checksum and the selected address was derived locally. It does not mean an existing wallet was found or that it contains funds. This app never tests phrases against live wallet services, checks balances, or imports phrases into third-party wallets. Never paste a real recovery phrase here.</p></aside>
      <footer>PARAPHRASE BOT <span>·</span> NO SERVER · NO PHRASE STORAGE · NO BALANCE LOOKUPS</footer>
    </main>
  );
}

function WalletCompatibility({ addresses }) {
  const networkMatches = {
    bitcoin: addresses.filter((item) => item.network.toLowerCase().includes("bitcoin")),
    bitcoinModern: addresses.filter((item) => /native segwit|taproot/i.test(item.network)),
    evm: addresses.filter((item) => /ethereum|bnb smart chain|polygon/i.test(item.network)),
    tron: addresses.filter((item) => item.network.toLowerCase().includes("tron")),
  };
  const wallets = [
    { name: "OKX Wallet", kind: "Multi-chain self-custody wallet", supports: ["Bitcoin", "Ethereum / EVM", "BNB Chain", "Polygon", "TRON"], families: ["bitcoin", "evm", "tron"], note: "OKX documents multi-chain seed-phrase import and support for these networks." },
    { name: "Binance Wallet Extension", kind: "Self-custody Web3 wallet", supports: ["Ethereum / EVM", "BNB Chain", "TRON"], families: ["evm", "tron"], note: "Binance documents importing existing seed phrases. This is separate from a regular Binance exchange account." },
    { name: "Trust Wallet", kind: "Multi-chain self-custody wallet", supports: ["Bitcoin", "Ethereum / EVM", "BNB Chain", "Polygon", "TRON"], families: ["bitcoin", "evm", "tron"], note: "Network support does not confirm the original wallet app or its derivation settings." },
    { name: "MetaMask", kind: "Self-custody wallet", supports: ["Ethereum / EVM"], families: ["evm"], note: "The match shown here is for EVM address formats. Other MetaMask account types and network features may differ." },
    { name: "Coinbase Wallet", kind: "Self-custody wallet", supports: ["Bitcoin", "Ethereum / EVM", "BNB Chain", "Polygon"], families: ["bitcoin", "evm"], note: "Coinbase distinguishes mnemonic wallets from passkey smart wallets; their network capabilities are not identical." },
    { name: "Phantom", kind: "Multi-chain self-custody wallet", supports: ["Bitcoin Native SegWit / Taproot", "Ethereum", "Polygon", "BNB Chain"], families: ["bitcoinModern", "evm"], note: "Its Bitcoin support is Native SegWit and Taproot; a Legacy-only result is not counted as a match." },
    { name: "Exodus", kind: "Multi-chain self-custody wallet", supports: ["Bitcoin", "Ethereum", "BNB Smart Chain", "Polygon", "TRON"], families: ["bitcoin", "evm", "tron"], note: "Supported assets and integrations vary by device and app version." },
    { name: "Guarda", kind: "Multi-chain self-custody wallet", supports: ["Bitcoin", "Ethereum / EVM", "TRON"], families: ["bitcoin", "evm", "tron"], note: "Guarda documents importing an existing wallet using a 12- or 24-word mnemonic." },
    { name: "Rabby Wallet", kind: "EVM self-custody wallet", supports: ["Ethereum / EVM", "BNB Chain", "Polygon"], families: ["evm"], note: "EVM network-family match only." },
    { name: "Rainbow", kind: "EVM self-custody wallet", supports: ["Ethereum / EVM", "Polygon and EVM networks"], families: ["evm"], note: "EVM network-family match only." },
    { name: "Kraken Wallet", kind: "Self-custody wallet", supports: ["Bitcoin", "Ethereum / EVM"], families: ["bitcoin", "evm"], note: "Check the exact supported network and account type in the current Kraken Wallet documentation." },
    { name: "Crypto.com Onchain", kind: "Self-custody wallet", supports: ["Bitcoin", "Ethereum / EVM", "Polygon", "TRON"], families: ["bitcoin", "evm", "tron"], note: "Availability and recovery options can vary by wallet version." },
    { name: "SafePal", kind: "Software / hardware wallet ecosystem", supports: ["Bitcoin", "Ethereum / EVM", "BNB Chain", "Polygon", "TRON"], families: ["bitcoin", "evm", "tron"], note: "Network support is not proof that a phrase was created by SafePal." },
    { name: "Tangem", kind: "Hardware wallet ecosystem", supports: ["Bitcoin", "Ethereum / EVM", "Polygon", "TRON"], families: ["bitcoin", "evm", "tron"], note: "A network match does not confirm a Tangem card or its backup configuration." },
    { name: "Ledger Live", kind: "Hardware wallet companion app", supports: ["Bitcoin", "Ethereum / EVM", "Polygon", "TRON"], families: ["bitcoin", "evm", "tron"], note: "Ledger account paths and device configuration can differ; this is not device identification." },
    { name: "Trezor Suite", kind: "Hardware wallet companion app", supports: ["Bitcoin", "Ethereum / EVM"], families: ["bitcoin", "evm"], note: "Third-party integrations may add networks; this row covers the main Bitcoin and EVM families only." },
    { name: "Electrum", kind: "Bitcoin-only wallet", supports: ["Bitcoin"], families: ["bitcoin"], note: "Bitcoin derivation format and script type must match the wallet configuration." },
    { name: "Sparrow Wallet", kind: "Bitcoin-only wallet", supports: ["Bitcoin"], families: ["bitcoin"], note: "Bitcoin derivation format and script type must match the wallet configuration." },
    { name: "BlueWallet", kind: "Bitcoin-focused wallet", supports: ["Bitcoin"], families: ["bitcoin"], note: "Bitcoin derivation format and script type must match the wallet configuration." },
    { name: "Wasabi Wallet", kind: "Bitcoin-only wallet", supports: ["Bitcoin"], families: ["bitcoin"], note: "Bitcoin derivation format and script type must match the wallet configuration." },
  ];
  const getMatches = (families) => families.flatMap((family) => {
    if (family === "bitcoin") return networkMatches.bitcoin;
    if (family === "bitcoinModern") return networkMatches.bitcoinModern;
    if (family === "evm") return networkMatches.evm;
    if (family === "tron") return networkMatches.tron;
    return [];
  });
  return (
    <div className="wallet-compatibility">
      <div className="wallet-compatibility-heading">
        <div><p className="eyebrow">05 / PLATFORM COMPATIBILITY</p><h3>Wallets & exchanges</h3></div>
        <span className="tag">NETWORK MATCH ONLY</span>
      </div>
      <p className="wallet-compatibility-intro">This catalogue compares the locally derived address families with published wallet network support. A match cannot tell us which app created a phrase, prove an account exists, or confirm that the app will restore the same account. Account index, derivation path, script type and wallet version matter.</p>
      <div className="wallet-platform-grid">
        {wallets.map((wallet) => {
          const matches = getMatches(wallet.families);
          return (
            <article className="wallet-platform" key={wallet.name}>
              <div className="wallet-platform-title"><strong>{wallet.name}</strong><span className={matches.length ? "platform-match" : "platform-no-match"}>{matches.length ? "NETWORK FAMILY MATCH" : "NO DERIVED NETWORK"}</span></div>
              <p className="wallet-kind">{wallet.kind}</p>
              <p className="wallet-networks">Supports: {wallet.supports.join(" · ")}</p>
              {matches.length > 0 && <p className="wallet-match-detail">Matched locally: {[...new Set(matches.map((item) => item.network))].join(" · ")}</p>}
              <p>{wallet.note}</p>
            </article>
          );
        })}
      </div>
      <div className="exchange-separation">
        <strong>Centralized exchange accounts are different</strong>
        <p>Regular Binance, Coinbase, Kraken and OKX exchange accounts are login-based custodial accounts, not wallets identified by a BIP-39 phrase. The matching OKX Wallet or Binance Wallet product is a separate Web3 wallet product. This tool does not identify exchange customers or test logins.</p>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="stat-card"><strong>{value.toLocaleString()}</strong><span>{label}</span></div>;
}

function Check({ label, ok }) {
  return <div className="check-row"><span>{label}</span><b className={ok ? "check-good" : ""}>{ok ? "✓ PASS" : "—"}</b></div>;
}
