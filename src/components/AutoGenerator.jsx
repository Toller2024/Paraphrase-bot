// src/components/AutoGenerator.jsx
import { useEffect, useRef, useState } from "react";
import { createMnemonic } from "../services/mnemonicService.js";
import { deriveNetworkAddress } from "../services/networkDerivationService.js";
import {
  addEntry,
  getAllEntries,
  clearBin,
  storageStats,
  formatBytes,
} from "../services/binService.js";

const INTERVAL_MS = 1000; // one phrase + address pair per second
const NETWORKS = [
  "ethereum",
  "bsc",
  "polygon",
  "tron",
  "bitcoin-legacy",
  "bitcoin-segwit",
  "bitcoin-taproot",
];

export default function AutoGenerator() {
  const [running, setRunning] = useState(false);
  const [network, setNetwork] = useState("ethereum");
  const [wordCount, setWordCount] = useState(12);
  const [records, setRecords] = useState(0);
  const [stats, setStats] = useState(null);
  const [lastEntry, setLastEntry] = useState(null);
  const [recent, setRecent] = useState([]);
  const [errors, setErrors] = useState(0);
  const timer = useRef(null);
  const busy = useRef(false);

  async function generateAndStore() {
    if (busy.current) return; // never overlap: keeps exactly one per tick
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
      await addEntry(record); // phrase + its address stored together in one row
      setLastEntry(record);
      const s = await storageStats();
      setStats(s);
      setRecords(s.records); // FIX: keep the record counter live
      setRecent((prev) => [record, ...prev].slice(0, 20));
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

  // Load persisted state on mount (bin survives page reloads)
  useEffect(() => {
    storageStats()
      .then((s) => { setStats(s); setRecords(s.records); })
      .catch(() => {});
    getAllEntries(20)
      .then((rows) => { setRecent(rows.reverse()); if (rows.length) setLastEntry(rows[rows.length - 1]); })
      .catch(() => {});
  }, []);

  const perRecordBytes = lastEntry ? JSON.stringify(lastEntry).length : 0;

  return (
    <section>
      <h2>Auto Generator + Storage Bin</h2>

      <label style={{ marginRight: "1rem" }}>
        Network:{" "}
        <select value={network} onChange={(e) => setNetwork(e.target.value)}>
          {NETWORKS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      <label style={{ marginRight: "1rem" }}>
        Words:{" "}
        <select value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))}>
          <option value={12}>12</option>
          <option value={24}>24</option>
        </select>
      </label>

      <button onClick={() => setRunning((r) => !r)}>
        {running ? "Stop" : "Start (1/sec)"}
      </button>{" "}
      <button
        onClick={async () => {
          await clearBin();
          setRecords(0);
          setRecent([]);
          setLastEntry(null);
          setStats(await storageStats());
        }}
      >
        Empty bin
      </button>

      <h3>Latest entry (phrase + its address, stored together)</h3>
      {lastEntry ? (
        <pre>{`${lastEntry.createdAt}
${lastEntry.network}
${lastEntry.path}
address: ${lastEntry.address}
phrase:  ${lastEntry.phrase}`}</pre>
      ) : (
        <p>Nothing generated yet.</p>
      )}

      <h3>Recent bin entries (newest first)</h3>
      {recent.length ? (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Address</th>
              <th>Phrase</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r, i) => (
              <tr key={r.id ?? i}>
                <td>{r.id ?? i}</td>
                <td>{r.createdAt}</td>
                <td style={{ fontFamily: "monospace" }}>{r.address}</td>
                <td style={{ fontFamily: "monospace" }}>{r.phrase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Bin is empty.</p>
      )}

      <h3>Bin storage status</h3>
      <ul>
        <li>Records stored: {records}</li>
        <li>Derivation/storage errors: {errors}</li>
        <li>Bytes per record (JSON): {perRecordBytes ? formatBytes(perRecordBytes) : "—"}</li>
        <li>Bin usage (this origin): {stats ? formatBytes(stats.usageBytes) : "—"}</li>
        <li>Bin capacity (browser quota): {stats ? formatBytes(stats.quotaBytes) : "—"}</li>
        {stats && stats.quotaBytes > 0 && perRecordBytes > 0 && (
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
