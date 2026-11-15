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
  const [simulationSize, setSimulationSize] = useState(1000);
  const [simulation, setSimulation] = useState({ runs: 0, valid: 0, derived: 0, failures: 0 });
  const [simulationResults, setSimulationResults] = useState([]);
  const [simulationProgress, setSimulationProgress] = useState(0);
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

  async function runSimulation() {
    if (simulationBusy) return;
    setSimulationBusy(true);
    setSimulationProgress(0);
    setSimulationResults([]);
    setSimulation({ runs: 0, valid: 0, derived: 0, failures: 0 });
    let runs = 0;
    let valid = 0;
    let derivedCount = 0;
    let failures = 0;
    const visibleResults = [];
    const chunkSize = 100;

    try {
      while (runs < simulationSize) {
        const thisChunk = Math.min(chunkSize, simulationSize - runs);
        for (let index = 0; index < thisChunk; index += 1) {
          const sample = createMnemonic(wordCount);
          const checked = checkMnemonic(sample);
          runs += 1;
          if (!checked.valid) {
            failures += 1;
            continue;
          }
          valid += 1;
          try {
            const address = deriveNetworkAddress(sample, network);
            derivedCount += 1;
            if (visibleResults.length < 25) {
              visibleResults.push({
                id: runs,
                phrase: sample,
                wordCount: wordCount,
                network: address.network,
                path: address.path,
                address: address.address,
                note: address.note,
              });
            }
          } catch {
            failures += 1;
          }
        }
        setSimulation({ runs: runs, valid: valid, derived: derivedCount, failures: failures });
        setSimulationProgress(Math.round((runs / simulationSize) * 100));
        setSimulationResults(visibleResults.slice());
        if (runs < simulationSize) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
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
        <div className="panel-heading"><div><p className="eyebrow">02 / LOCAL COMPATIBILITY TEST</p><h2>Batch research</h2></div><span className="tag">LOCAL ONLY</span></div>
        <p className="simulation-intro">Generate random test phrases, validate BIP-39 checksums and derive the selected network address locally. The batch never contacts wallet providers or checks whether an address belongs to anyone.</p>
        <label className="field-label" htmlFor="simulation-size">SAMPLE SIZE</label>
        <select id="simulation-size" value={simulationSize} onChange={(event) => setSimulationSize(Number(event.target.value))}>
          <option value={100}>100 samples</option>
          <option value={1000}>1,000 samples</option>
          <option value={10000}>10,000 samples</option>
          <option value={100000}>100,000 samples</option>
          <option value={1000000}>1,000,000 samples</option>
        </select>
        <button className="secondary simulation-button" disabled={simulationBusy} onClick={runSimulation}>{simulationBusy ? "Processing locally…" : `Run ${simulationSize.toLocaleString()}-sample test`}</button>
        {simulationBusy && <div className="progress-track"><div className="progress-fill" style={{ width: simulationProgress + "%" }} /></div>}
        <p className="progress-label">{simulationProgress}% complete · {simulation.runs.toLocaleString()} / {simulationSize.toLocaleString()} processed</p>
        <div className="stats-grid">
          <Stat label="Samples run" value={simulation.runs} />
          <Stat label="BIP-39 valid" value={simulation.valid} />
          <Stat label="Addresses derived" value={simulation.derived} />
          <Stat label="Errors" value={simulation.failures} />
        </div>
        <p className="simulation-footnote">Up to 25 successful samples are shown below for inspection. All samples and results exist only in page memory and are cleared when you run a new batch or leave the page. A valid phrase and derived address do not indicate an existing wallet or owner.</p>
        {simulationResults.length > 0 && <div className="sample-results"><div className="results-heading"><strong>Verified local samples</strong><span>{simulationResults.length} displayed · maximum 25</span></div>{simulationResults.map((item) => <article className="sample-card" key={item.id}><div className="sample-card-heading"><strong>Sample #{item.id}</strong><span className="status good">BIP-39 VALID · ADDRESS DERIVED</span></div><div className="sample-words">{item.phrase.split(" ").map((word, index) => <span key={index}><small>{index + 1}.</small>{word}</span>)}</div><p className="sample-meta">{item.network} · {item.path}</p><code className="sample-address">{item.address}</code><div className="actions"><button className="secondary" onClick={() => copyValue(item.phrase, "Sample phrase")}>Copy phrase</button><button className="secondary" onClick={() => copyValue(item.address, "Derived address")}>Copy address</button></div></article>)}</div>}
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
