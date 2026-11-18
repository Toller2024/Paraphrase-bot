// src/components/AutoGenerator.jsx
import { useEffect, useRef, useState } from "react";
import { createMnemonic } from "../services/mnemonicService.js";
import { deriveNetworkAddress } from "../services/networkDerivationService.js";
import { addEntry, countEntries, clearBin, storageStats, formatBytes } from "../services/binService.js";

const INTERVAL_MS = 1000; // one phrase per second
const NETWORKS = ["ethereum", "bsc", "polygon", "tron", "bitcoin-legacy", "bitcoin-segwit", "bitcoin-taproot"];

export default function AutoGenerator() {
  const [running, setRunning] = useState(false);
  const [network, setNetwork] = useState("ethereum");
  const [wordCount, setWordCount] = useState(12);
  const [records, setRecords] = useState(0);
  const [stats, setStats] = useState(null);
  const [lastEntry, setLastEntry] = useState(null);
  const [errors, setErrors] = useState(0);
  const timer = useRef(null);
  const busy = useRef(false);

  async function generateAndStore() {
    if (busy.current) return; // never overlap; keeps exactly one per tick
    busy.current = true;
    try {
      const phrase = createMnemonic(wordCount);
      const derived = deriveNetworkAddress(phrase, network);
      const record = {
        createdAt: new Date().toISOString(),
        phrase,
        address: derived.address,
        path: derived.path,
        network: derived.network,
      };
      await addEntry(record);
      setLastEntry(record);
      const s = await storageStats();
      setStats(s);
    } catch {
      setErrors((e) => e + 1);
    } finally {
      busy.current = false;
    }
  }

  useEffect(() => {
    if (running) {
      generateAndStore(); // fire immediately, then every second
      timer.current = setInterval(generateAndStore, INTERVAL_MS);
    }
    return () => clearInterval(timer.current);
  }, [running]);

  useEffect(() => { countEntries().then(setRecords).catch(() => {}); }, []);

  const perRecordBytes = lastEntry ? JSON.stringify(lastEntry).length : 0;

  return (
    <section>
      <h2>Auto Generator + Bin</h2>

      <label>
        Network:{" "}
        <select value={network} onChange={(e) => setNetwork(e.target.value)}>
          {NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <label>
        Words:{" "}
        <select value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))}>
          <option value={12}>12</option>
          <option value={24}>24</option>
        </select>
      </label>

      <button onClick={() => setRunning((r) => !r)}>{running ? "Stop" : "Start (1/sec)"}</button>
      <button onClick={async () => { await clearBin(); setRecords(0); setStats(await storageStats()); }}>
        Empty bin
      </button>

      <h3>Live entry</h3>
      {lastEntry ? (
        <pre>{`${lastEntry.createdAt}\n${lastEntry.network}\n${lastEntry.path}\n${lastEntry.address}\n${lastEntry.phrase}`}</pre>
      ) : <p>Nothing generated yet.</p>}

      <h3>Bin status</h3>
      <ul>
        <li>Records stored: {records}</li>
        <li>Derivation errors: {errors}</li>
        <li>Bytes per record (JSON): {perRecordBytes ? formatBytes(perRecordBytes) : "—"}</li>
        <li>Bin usage (origin total): {stats ? formatBytes(stats.usageBytes) : "—"}</li>
        <li>Bin capacity (browser quota): {stats ? formatBytes(stats.quotaBytes) : "—"}</li>
        {stats && stats.quotaBytes > 0 && (
          <li>
            Capacity used: {((stats.usageBytes / stats.quotaBytes) * 100).toFixed(4)}% — at ~
            {perRecordBytes} B/record, a full bin holds roughly{" "}
            {formatBytes(stats.quotaBytes / perRecordBytes)} records.
          </li>
        )}
      </ul>
    </section>
  );
}
