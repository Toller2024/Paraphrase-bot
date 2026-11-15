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
  // Only show a positive match where official documentation confirms both
  // phrase import and the derivation path used by this simulator.
  const bitcoin = addresses.filter((item) => item.network.toLowerCase().includes("bitcoin"));
  const evm = addresses.filter((item) => /ethereum|bnb smart chain|polygon/i.test(item.network));
  const tron = addresses.filter((item) => item.network.toLowerCase().includes("tron"));

  const wallets = [
    { name: "Exodus", kind: "Multi-chain self-custody wallet", status: "PATHS DOCUMENTED", matches: [...bitcoin, ...evm, ...tron], evidence: "Exodus publishes its default BTC Legacy, Native SegWit, Taproot, Ethereum, BNB Smart Chain, Polygon and TRON derivation paths. Match is limited to the paths shown in its documentation.", url: "https://www.exodus.com/support/en/articles/8598933-derivation-paths-in-exodus" },
    { name: "MetaMask", kind: "Self-custody wallet", status: "EVM PATH DOCUMENTED", matches: evm.filter((item) => item.network.toLowerCase().includes("ethereum")), evidence: "MetaMask documents phrase import using its default BIP-44 path. This entry only matches the first Ethereum-style address derived here; it does not claim support for Bitcoin or TRON.", url: "https://support.metamask.io/configure/wallet/importing-a-seed-phrase-from-another-wallet-software-derivation-path/" },
    { name: "Coinbase Wallet", kind: "Self-custody wallet", status: "IMPORT DOCUMENTED · PATH UNCONFIRMED", matches: [], evidence: "Coinbase documents importing a 12-word recovery phrase. The exact derivation path needed to confirm this simulator's addresses has not been established here.", url: "https://help.coinbase.com/en/wallet/getting-started/manage-wallets" },
    { name: "Kraken Wallet", kind: "Self-custody wallet", status: "IMPORT DOCUMENTED · PATH UNCONFIRMED", matches: [], evidence: "Kraken documents importing 12-, 18- or 24-word BIP-39 phrases and lists supported network families. Exact matching paths are not confirmed here.", url: "https://support.kraken.com/articles/importing-a-wallet-to-kraken-wallet" },
    { name: "Crypto.com Onchain", kind: "Self-custody wallet", status: "IMPORT DOCUMENTED · PATH UNCONFIRMED", matches: [], evidence: "Crypto.com documents importing 12-, 18- or 24-word recovery phrases. Exact matching derivation paths are not confirmed here.", url: "https://help.crypto.com/en/articles/3824750-how-do-i-import-or-recover-my-wallet" },
    { name: "OKX Wallet", kind: "Multi-chain self-custody wallet", status: "NOT VERIFIED", matches: [], evidence: "Exact phrase-import and derivation-path compatibility has not been verified in this audit." },
    { name: "Binance Wallet Extension", kind: "Self-custody Web3 wallet", status: "NOT VERIFIED", matches: [], evidence: "Exact phrase-import and derivation-path compatibility has not been verified in this audit. This is distinct from a Binance exchange account." },
    { name: "Trust Wallet", kind: "Multi-chain self-custody wallet", status: "NOT VERIFIED", matches: [], evidence: "Exact phrase-import and derivation-path compatibility has not been verified in this audit." },
    { name: "Phantom", kind: "Multi-chain self-custody wallet", status: "NOT VERIFIED", matches: [], evidence: "Exact phrase-import and derivation-path compatibility has not been verified in this audit." },
    { name: "Guarda", kind: "Multi-chain self-custody wallet", status: "NOT VERIFIED", matches: [], evidence: "Exact phrase-import and derivation-path compatibility has not been verified in this audit." },
    { name: "Rabby Wallet", kind: "EVM self-custody wallet", status: "NOT VERIFIED", matches: [], evidence: "Exact phrase-import and derivation-path compatibility has not been verified in this audit." },
    { name: "Rainbow", kind: "EVM self-custody wallet", status: "NOT VERIFIED", matches: [], evidence: "Exact phrase-import and derivation-path compatibility has not been verified in this audit." },
    { name: "SafePal", kind: "Software / hardware wallet ecosystem", status: "NOT VERIFIED", matches: [], evidence: "Exact phrase-import and derivation-path compatibility has not been verified in this audit." },
    { name: "Tangem", kind: "Hardware wallet ecosystem", status: "NOT VERIFIED", matches: [], evidence: "Exact phrase-import and derivation-path compatibility has not been verified in this audit." },
    { name: "Ledger Live", kind: "Hardware wallet companion app", status: "NOT VERIFIED", matches: [], evidence: "Exact phrase-import and derivation-path compatibility has not been verified in this audit. Device-based recovery can use different account paths." },
    { name: "Trezor Suite", kind: "Hardware wallet companion app", status: "NOT VERIFIED", matches: [], evidence: "Exact phrase-import and derivation-path compatibility has not been verified in this audit." },
    { name: "Electrum", kind: "Bitcoin-focused wallet", status: "NOT VERIFIED", matches: [], evidence: "Exact BIP-39 import settings and derivation path compatibility have not been verified in this audit." },
    { name: "Sparrow Wallet", kind: "Bitcoin-focused wallet", status: "NOT VERIFIED", matches: [], evidence: "Exact BIP-39 import settings and derivation path compatibility have not been verified in this audit." },
    { name: "BlueWallet", kind: "Bitcoin-focused wallet", status: "NOT VERIFIED", matches: [], evidence: "Exact BIP-39 import settings and derivation path compatibility have not been verified in this audit." },
    { name: "Wasabi Wallet", kind: "Bitcoin-focused wallet", status: "NOT VERIFIED", matches: [], evidence: "Exact BIP-39 import settings and derivation path compatibility have not been verified in this audit." },
  ];

  return (
    <div className="wallet-compatibility">
      <div className="wallet-compatibility-heading">
        <div><p className="eyebrow">05 / EVIDENCE-BASED COMPATIBILITY</p><h3>Wallet documentation audit</h3></div>
        <span className="tag">NO GUESSED MATCHES</span>
      </div>
      <p className="wallet-compatibility-intro">A wallet is marked as a match only when official documentation confirms phrase import and the relevant derivation path. Network support alone is not enough. “Import documented” does not mean this simulator's derived address has been confirmed to match.</p>
      <div className="wallet-platform-grid">
        {wallets.map((wallet) => (
          <article className="wallet-platform" key={wallet.name}>
            <div className="wallet-platform-title"><strong>{wallet.name}</strong><span className={wallet.matches.length ? "platform-match" : "platform-no-match"}>{wallet.status}</span></div>
            <p className="wallet-kind">{wallet.kind}</p>
            <p>{wallet.evidence}</p>
            {wallet.url && <p><a href={wallet.url} target="_blank" rel="noreferrer">Official documentation</a></p>}
            {wallet.matches.length > 0 && <p className="wallet-match-detail">Verified derivation address formats in this simulator: {[...new Set(wallet.matches.map((item) => item.network))].join(" · ")}</p>}
          </article>
        ))}
      </div>
      <div className="exchange-separation">
        <strong>Centralized exchange accounts are different</strong>
        <p>Regular Binance, Coinbase, Kraken and OKX exchange accounts are custodial login-based accounts. They are not identified by a self-custody BIP-39 recovery phrase. Their separate wallet products must be assessed independently.</p>
      </div>
      <p className="wallet-compatibility-intro">This is a documentation status report, not a wallet finder. It cannot identify which app created a phrase, prove that an account exists, or establish ownership.</p>
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="stat-card"><strong>{value.toLocaleString()}</strong><span>{label}</span></div>;
}

function Check({ label, ok }) {
  return <div className="check-row"><span>{label}</span><b className={ok ? "check-good" : ""}>{ok ? "✓ PASS" : "—"}</b></div>;
}
