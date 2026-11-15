import { useMemo, useState } from "react";
import { createMnemonic, checkMnemonic } from "./services/mnemonicService.js";
import { deriveEvmAddress } from "./services/derivationService.js";

export default function App() {
  const [wordCount, setWordCount] = useState(12);
  const [phrase, setPhrase] = useState("");
  const [generated, setGenerated] = useState(0);
  const [error, setError] = useState("");
  const validation = useMemo(() => checkMnemonic(phrase), [phrase]);
  const derived = useMemo(() => {
    if (!validation.valid) return null;
    try { return deriveEvmAddress(phrase); } catch { return null; }
  }, [phrase, validation.valid]);

  function generate() {
    try {
      const next = createMnemonic(wordCount);
      setPhrase(next);
      setGenerated((count) => count + 1);
      setError("");
    } catch (err) {
      setError(err.message || "Generation failed.");
    }
  }

  async function copyPhrase() {
    try {
      await navigator.clipboard.writeText(phrase);
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
        <div className="panel-heading"><div><p className="eyebrow">02 / MNEMONIC OUTPUT</p><h2>Recovery phrase</h2></div><span className="tag">BIP-39 ENGLISH</span></div>
        <div className="phrase-box">
          {phrase ? phrase.split(" ").map((word, index) => <span className="word" key={index}><small>{String(index + 1).padStart(2, "0")}</small>{word}</span>) : <p className="placeholder">Generate a phrase to display its words here.</p>}
        </div>
        <div className="actions">
          <button className="secondary" disabled={!phrase} onClick={copyPhrase}>Copy phrase</button>
          <button className="secondary" disabled={!phrase} onClick={() => setPhrase("")}>Clear</button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">03 / LOCAL VALIDATION</p><h2>Compatibility checks</h2></div><span className={validation.valid ? "status good" : "status"}>{validation.valid ? "VALID" : "WAITING"}</span></div>
        <div className="checks">
          <Check label="Word count" ok={validation.wordCountValid} />
          <Check label="Words in BIP-39 list" ok={validation.allWordsKnown} />
          <Check label="BIP-39 checksum" ok={validation.checksumValid} />
        </div>
        {derived && <div className="address-card"><p className="eyebrow">FIRST EVM ADDRESS · {derived.path}</p><code>{derived.address}</code><p>Compatible address format: Ethereum · BNB Smart Chain · Polygon</p></div>}
      </section>

      <aside className="notice"><strong>Research safety notice</strong><p>A green BIP-39 validation result confirms only that the phrase is correctly formatted. It does not mean the phrase belongs to an existing wallet or controls funds. This app never tests phrases against live wallet services, checks balances, or imports phrases into third-party wallets. Never paste a real recovery phrase here.</p></aside>
      <footer>PARAPHRASE BOT <span>·</span> NO SERVER · NO PHRASE STORAGE · NO BALANCE LOOKUPS</footer>
    </main>
  );
}

function Check({ label, ok }) {
  return <div className="check-row"><span>{label}</span><b className={ok ? "check-good" : ""}>{ok ? "✓ PASS" : "—"}</b></div>;
}
