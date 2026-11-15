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
  const [simulationSize, setSimulationSize] = useState(25);
  const [simulation, setSimulation] = useState({ runs: 0, valid: 0, derived: 0, failures: 0 });
  const [simulationBusy, setSimulationBusy] = useState(false);
  const validation = useMemo(() => checkMnemonic(phrase), [phrase]);
  const derived = useMemo(() => {
    if (!validation.valid) return null;
    try { return deriveNetworkAddress(phrase, network); } catch { return null; }
  }, [phrase, network, validation.valid]);
  const fullyVerified = validation.valid && Boolean(derived);

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

  function runSimulation() {
    setSimulationBusy(true);
    try {
      let valid = 0;
      let derivedCount = 0;
      let failures = 0;
      for (let index = 0; index < simulationSize; index += 1) {
        const sample = createMnemonic(wordCount);
        const result = checkMnemonic(sample);
        if (result.valid) {
          valid += 1;
          try { deriveNetworkAddress(sample, network); derivedCount += 1; }
          catch { failures += 1; }
        } else { failures += 1; }
      }
      setSimulation((current) => ({
        runs: current.runs + simulationSize,
        valid: current.valid + valid,
        derived: current.derived + derivedCount,
        failures: current.failures + failures,
      }));
      setError("");
    } catch (err) {
      setError(err.message || "Simulation could not complete.");
    } finally {
      setSimulationBusy(false);
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
      <section className="panel simulation-panel">
        <div className="panel-heading"><div><p className="eyebrow">02 / SAFE SIMULATION</p><h2>Batch research</h2></div><span className="tag">NO PHRASES SAVED</span></div>
        <p className="simulation-intro">Generate temporary random samples, validate their BIP-39 checksums, and derive addresses locally. Only aggregate counts are kept in this browser session.</p>
        <label className="field-label" htmlFor="simulation-size">SAMPLE SIZE</label>
        <select id="simulation-size" value={simulationSize} onChange={(event) => setSimulationSize(Number(event.target.value))}>
          <option value={10}>10 samples</option>
          <option value={25}>25 samples</option>
          <option value={50}>50 samples</option>
          <option value={100}>100 samples</option>
        </select>
        <button className="secondary simulation-button" disabled={simulationBusy} onClick={runSimulation}>{simulationBusy ? "Running simulation…" : `Run ${simulationSize}-sample simulation`}</button>
        <div className="stats-grid">
          <Stat label="Samples run" value={simulation.runs} />
          <Stat label="BIP-39 valid" value={simulation.valid} />
          <Stat label="Addresses derived" value={simulation.derived} />
          <Stat label="Errors" value={simulation.failures} />
        </div>
        <p className="simulation-footnote">These are generated test samples, not attempts to discover existing wallets or funds. Samples are discarded after each run.</p>
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
      </section>
      <aside className="notice"><strong>Research safety notice</strong><p>Green means the BIP-39 phrase passes its checksum and the selected address was derived locally. It does not mean an existing wallet was found or that it contains funds. This app never tests phrases against live wallet services, checks balances, or imports phrases into third-party wallets. Never paste a real recovery phrase here.</p></aside>
      <footer>PARAPHRASE BOT <span>·</span> NO SERVER · NO PHRASE STORAGE · NO BALANCE LOOKUPS</footer>
    </main>
  );
}

function Stat({ label, value }) {
  return <div className="stat-card"><strong>{value.toLocaleString()}</strong><span>{label}</span></div>;
}

function Check({ label, ok }) {
  return <div className="check-row"><span>{label}</span><b className={ok ? "check-good" : ""}>{ok ? "✓ PASS" : "—"}</b></div>;
}
