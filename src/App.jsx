import { useMemo, useState } from "react";
import { createMnemonic, checkMnemonic } from "./services/mnemonicService.js";
import { deriveNetworkAddress } from "./services/networkDerivationService.js";
import { fetchPublicAddressBalance } from "./services/balanceMonitorService.js";

export default function App() {
  const [wordCount, setWordCount] = useState(12);
  const [phrase, setPhrase] = useState("");
  const [network, setNetwork] = useState("ethereum");
  const [generated, setGenerated] = useState(0);
  const [generationProof, setGenerationProof] = useState(null);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [monitorNetwork, setMonitorNetwork] = useState("bitcoin");
  const [monitorAddress, setMonitorAddress] = useState("");
  const [balanceResult, setBalanceResult] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState("");
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
      const nextPhrase = createMnemonic(wordCount);
      const selfCheck = checkMnemonic(nextPhrase);
      if (!selfCheck.valid) throw new Error("Generated phrase did not pass its BIP-39 self-check.");
      const networks = ["bitcoin-legacy", "bitcoin-segwit", "bitcoin-taproot", "ethereum", "bsc", "polygon", "tron"];
      const derivedCount = networks.filter((id) => {
        try { deriveNetworkAddress(nextPhrase, id); return true; } catch { return false; }
      }).length;
      if (derivedCount !== networks.length) throw new Error("One or more supported address derivations failed.");
      setPhrase(nextPhrase);
      setGenerationProof({ wordCount, entropyBits: wordCount === 12 ? 128 : 256, derivedCount });
      setGenerated((count) => count + 1);
      setError("");
      setCopyMessage("");
    } catch (err) {
      setError(err.message || "Generation failed.");
    }
  }

  async function checkPublicBalance() {
    setBalanceLoading(true); setBalanceError(""); setBalanceResult(null);
    try { const result = await fetchPublicAddressBalance(monitorNetwork, monitorAddress.trim()); setBalanceResult(result); }
    catch (err) { setBalanceError(err.message || "Unable to retrieve public blockchain data."); }
    finally { setBalanceLoading(false); }
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
        <p className="intro">A local research simulator for generating genuine English BIP-39 mnemonics from cryptographic randomness, checking the checksum, and deriving standard public-address formats locally.</p>
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
        {phrase && generationProof && <div className="generation-proof">
          <strong>GENERATION SELF-CHECK PASSED</strong>
          <span>{generationProof.wordCount} English BIP-39 words · {generationProof.entropyBits}-bit cryptographic entropy</span>
          <span>Word-list membership + checksum verified · {generationProof.derivedCount}/7 address derivations succeeded locally</span>
        </div>}
        <div className="actions">
          <button className="secondary" disabled={!phrase} onClick={() => copyValue(phrase, "Recovery phrase")}>Copy phrase</button>
          <button className="secondary" disabled={!phrase} onClick={() => { setPhrase(""); setGenerationProof(null); setCopyMessage(""); setError(""); }}>Clear</button>
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

      <section className="panel" id="public-balance-monitor">
        <div className="panel-heading"><div><p className="eyebrow">06 / LIVE PUBLIC-CHAIN LOOKUP</p><h2>Authorized address balance check</h2></div><span className="tag">ADDRESS ONLY</span></div>
        <p className="balance-intro">Enter a public address that you own or are explicitly authorized to monitor. This module queries public blockchain data directly; it never reads the recovery phrase above, derives an address from it, or searches for other wallets.</p>
        <label className="field-label" htmlFor="monitor-network">BLOCKCHAIN</label>
        <select id="monitor-network" value={monitorNetwork} onChange={(event) => {setMonitorNetwork(event.target.value);setBalanceResult(null);setBalanceError("");}}>
          <option value="bitcoin">Bitcoin · BTC</option><option value="ethereum">Ethereum · ETH</option><option value="bsc">BNB Smart Chain · BNB</option><option value="polygon">Polygon · POL</option><option value="tron">TRON · TRX</option>
        </select>
        <label className="field-label" htmlFor="monitor-address" style={{marginTop:15}}>PUBLIC WALLET ADDRESS</label>
        <input id="monitor-address" className="address-input" autoComplete="off" spellCheck="false" placeholder="Paste an authorized public address" value={monitorAddress} onChange={(event) => {setMonitorAddress(event.target.value);setBalanceResult(null);setBalanceError("");}} />
        <button className="primary" disabled={balanceLoading || !monitorAddress.trim()} onClick={checkPublicBalance}>{balanceLoading ? "Querying public blockchain…" : "Retrieve real on-chain balance"} <span>↗</span></button>
        {balanceError && <p className="error">{balanceError}</p>}
        {balanceResult && <div className="balance-result"><p className="eyebrow">LIVE RESPONSE · {balanceResult.network}</p><strong>{balanceResult.balance} {balanceResult.symbol}</strong><small>{balanceResult.address}</small><small>Source: {balanceResult.source}</small><small>Retrieved: {new Date(balanceResult.checkedAt).toLocaleString()}</small><p>Balance data is factual public-chain information, not a security-risk score. A non-zero or high balance alone does not indicate compromise. Assess risk using verified malicious-contract exposure, suspicious approvals, confirmed theft indicators, or other evidence.</p></div>}
        <p className="balance-disclaimer">Privacy: the address is sent to the selected public blockchain data endpoint. Do not enter private keys or recovery phrases. This feature checks native coin balance only; it does not enumerate tokens, identify owners, or monitor addresses in the background. Provider availability and rate limits may vary.</p>
      </section>
      <aside className="notice"><strong>Important security notice</strong><p>Generated phrases use real BIP-39 English words, cryptographic randomness, and a valid checksum. Successful derivation means the app can calculate addresses for the listed standards; it does not prove that a wallet already exists, identify a wallet owner, or indicate funds. Wallet compatibility is path-specific and is labelled only where documentation supports the exact path. The balance tool accepts only manually supplied, authorized public addresses; it never checks addresses derived from generated phrases. Never enter a customer’s real recovery phrase or use a website-generated phrase to secure significant funds; create real wallets with a trusted offline or hardware-wallet setup.</p></aside>
      <footer>PARAPHRASE BOT <span>·</span> NO SERVER · NO PHRASE STORAGE · AUTHORIZED ADDRESS LOOKUPS ONLY</footer>
    </main>
  );
}

function WalletCompatibility({ addresses }) {
  // A match is shown only when the exact derivation path used by this app
  // appears in the wallet provider's published documentation.
  const profiles = [
    {
      name: "Exodus",
      kind: "Multi-chain self-custody wallet",
      paths: ["m/44'/0'/0'/0/0", "m/84'/0'/0'/0/0", "m/86'/0'/0'/0/0", "m/44'/60'/0'/0/0"],
      evidence: "Exodus publishes these exact default paths for Bitcoin Legacy, Native SegWit, Taproot, Ethereum, BNB Smart Chain and Polygon. Its published TRON path differs from this app's TRON path, so TRON is deliberately not marked as a match.",
      url: "https://www.exodus.com/support/en/articles/8598933-derivation-paths-in-exodus",
    },
    {
      name: "MetaMask",
      kind: "EVM self-custody wallet",
      paths: ["m/44'/60'/0'/0/0"],
      evidence: "MetaMask documents BIP-44 phrase import using the default Ethereum path. Only this app's Ethereum-style address path is counted.",
      url: "https://support.metamask.io/configure/wallet/importing-a-seed-phrase-from-another-wallet-software-derivation-path/",
    },
    {
      name: "Phantom",
      kind: "Multi-chain self-custody wallet",
      paths: ["m/44'/60'/0'/0/0", "m/84'/0'/0'/0/0", "m/86'/0'/0'/0/0"],
      evidence: "Phantom publishes these exact paths for EVM, Bitcoin Native SegWit and Bitcoin Taproot recovery-phrase accounts. Bitcoin Legacy is not counted.",
      url: "https://help.phantom.com/articles/12988493966227",
    },
    {
      name: "Trust Wallet",
      kind: "Multi-chain self-custody wallet",
      paths: ["m/44'/60'/0'/0/0", "m/84'/0'/0'/0/0"],
      evidence: "Trust Wallet's developer documentation lists these default Bitcoin and Ethereum derivation paths. This row is limited to those exact paths; it does not claim all its supported networks are covered.",
      url: "https://github.com/trustwallet/developer/blob/master/wallet-core/wallet-core-usage.md",
    },
  ];

  const verified = profiles.map((wallet) => {
    const matches = addresses.filter((item) => wallet.paths.includes(item.path));
    return { ...wallet, matches };
  });

  const notAudited = [
    {
      name: "OKX Wallet",
      detail: "Official material confirms seed-phrase import and multi-chain address derivation, but the sources reviewed here do not specify an exact path for the address formats this app derives. Status remains NOT VERIFIED.",
      url: "https://www.okx.com/en-us/help/how-do-i-manage-my-wallet-web",
    },
    {
      name: "Binance Wallet Extension",
      detail: "Official material describes BIP-44 account derivation and account indexes, but does not establish an exact path for each address format this app derives. Status remains NOT VERIFIED.",
      url: "https://www.binance.com/en/support/faq/detail/8700d33d7cd145ca9dd1f611ec510c51",
    },
    {
      name: "Binance Keyless Wallet",
      detail: "A separate MPC/keyless wallet product; Binance states that it does not use seed phrases. A BIP-39 phrase-to-address match is not applicable to this wallet type.",
      url: "https://www.binance.com/en-PH/support/faq/detail/5a3fc86a702b43e1a4a398ebd8853b77",
    },
    ...[
      "Coinbase Wallet", "Guarda", "Rabby Wallet", "Rainbow", "Kraken Wallet",
      "Crypto.com Onchain", "SafePal", "Tangem", "Ledger Live", "Trezor Suite",
      "Electrum", "Sparrow Wallet", "BlueWallet", "Wasabi Wallet",
    ].map((name) => ({ name, detail: "No exact derivation-path match has been established in this audit. Compatibility is not claimed.", url: null })),
  ];

  return (
    <div className="wallet-compatibility">
      <div className="wallet-compatibility-heading">
        <div><p className="eyebrow">05 / EXACT ADDRESS-PATH AUDIT</p><h3>Confirmed derivation compatibility</h3></div>
        <span className="tag">PATH-LEVEL EVIDENCE</span>
      </div>
      <p className="wallet-compatibility-intro">A wallet is shown as a match only when its official documentation publishes the exact derivation path used to create an address in this simulator. A network being supported is not enough. This confirms documented path compatibility, not a live restore test or the identity/existence of a wallet.</p>
      <div className="wallet-platform-grid">
        {verified.map((wallet) => (
          <article className="wallet-platform" key={wallet.name}>
            <div className="wallet-platform-title"><strong>{wallet.name}</strong><span className={wallet.matches.length ? "platform-match" : "platform-no-match"}>{wallet.matches.length ? "EXACT PATH MATCH" : "NO PATH MATCH IN CURRENT OUTPUT"}</span></div>
            <p className="wallet-kind">{wallet.kind}</p>
            <p>{wallet.evidence}</p>
            {wallet.matches.length > 0 && <p className="wallet-match-detail">Exact paths matched: {[...new Set(wallet.matches.map((item) => item.path))].join(" · ")}<br />Address formats: {[...new Set(wallet.matches.map((item) => item.network))].join(" · ")}</p>}
            <p><a href={wallet.url} target="_blank" rel="noreferrer">Official derivation documentation</a></p>
          </article>
        ))}
      </div>
      <div className="exchange-separation">
        <strong>Exchange and wallet products — not yet verified to exact paths</strong>
        <div className="wallet-platform-grid">
          {notAudited.map((wallet) => (
            <article className="wallet-platform" key={wallet.name}>
              <div className="wallet-platform-title"><strong>{wallet.name}</strong><span className="platform-no-match">{wallet.name === "Binance Keyless Wallet" ? "NO SEED PHRASE" : "NOT VERIFIED"}</span></div>
              <p>{wallet.detail}</p>
              {wallet.url && <p><a href={wallet.url} target="_blank" rel="noreferrer">Official product documentation</a></p>}
            </article>
          ))}
        </div>
      </div>
      <div className="exchange-separation">
        <strong>Important limitation</strong>
        <p>Exact path agreement is a reproducible address-compatibility check, not proof that a wallet exists, belongs to anyone, or contains funds. This app does not test generated phrases against live services, probe accounts, or identify owners. Security alerts should be sent only through an authorized provider process or to customers who voluntarily run a self-check on their own wallet; never ask customers to disclose recovery phrases.</p>
      </div>
    </div>
  );
}

function Check({ label, ok }) {
  return <div className="check-row"><span>{label}</span><b className={ok ? "check-good" : ""}>{ok ? "✓ PASS" : "—"}</b></div>;
}
