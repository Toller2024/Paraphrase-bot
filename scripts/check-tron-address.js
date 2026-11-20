import fs from "node:fs";
import path from "node:path";

const API_BASE = "https://apilist.tronscanapi.com";
const INPUT_FILE = process.argv[2] || "tron-addresses.csv";
const OUTPUT_FILE = "tron-balance-results.csv";
const WORKERS = 2;
const PAUSE_BETWEEN_ADDRESSES_MS = 250;
const ADDRESS_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

function loadApiKey() {
  const envFile = ".env.local";
  if (!fs.existsSync(envFile)) {
    throw new Error("Missing .env.local. Create it in the project root and set TRONSCAN_API_KEY=your_key");
  }
  const line = fs.readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .find((value) => /^\s*TRONSCAN_API_KEY\s*=/.test(value));
  const key = line?.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  if (!key || key === "your_key") throw new Error("TRONSCAN_API_KEY is missing in .env.local");
  return key;
}

function readAddresses(file) {
  if (!fs.existsSync(file)) throw new Error(`Cannot find ${file}. Put tron-addresses.csv in the project folder.`);
  const lines = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
  const addresses = lines.slice(1).map((line) => {
    const match = line.match(/,\s*"?([T][1-9A-HJ-NP-Za-km-z]{33})"?\s*$/);
    return match?.[1] || null;
  }).filter((address) => address && ADDRESS_RE.test(address));
  return [...new Set(addresses)];
}

async function requestJson(url, apiKey, attempts = 5) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(url, {
      headers: { "TRON-PRO-API-KEY": apiKey, Accept: "application/json" }
    });
    if (response.ok) return response.json();

    const detail = await response.text();
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === attempts - 1) {
      throw new Error(`HTTP ${response.status}: ${detail.slice(0, 180)}`);
    }
    const waitMs = Math.min(30000, 1000 * (2 ** attempt));
    console.log(`Rate/server limit. Retrying in ${waitMs / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error("Request failed after retries");
}

function csvCell(value) {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

function readCompleted(file) {
  if (!fs.existsSync(file)) return new Set();
  return new Set(
    fs.readFileSync(file, "utf8").split(/\r?\n/).slice(1)
      .filter((line) => line.endsWith(',"OK"'))
      .map((line) => line.match(/^"([T][1-9A-HJ-NP-Za-km-z]{33})"/)?.[1])
      .filter(Boolean)
  );
}

async function checkAddress(address, apiKey) {
  const encoded = encodeURIComponent(address);
  const [account, tokens] = await Promise.all([
    requestJson(`${API_BASE}/api/accountv2?address=${encoded}`, apiKey),
    requestJson(`${API_BASE}/api/account/tokens?address=${encoded}&start=0&limit=200&hidden=1&show=2`, apiKey)
  ]);

  const trx = Number(account.balanceStr ?? account.balance ?? 0) / 1_000_000;
  const usdtToken = (tokens.data ?? []).find((token) =>
    String(token.tokenAbbr ?? "").toUpperCase() === "USDT" &&
    String(token.tokenType ?? "").toLowerCase() === "trc20"
  );

  let usdt = 0;
  if (usdtToken) {
    const decimals = Number(usdtToken.tokenDecimal ?? 6);
    const raw = usdtToken.balance ?? usdtToken.quantity ?? usdtToken.amount ?? 0;
    usdt = Number(raw);
    if (usdtToken.balance != null) usdt /= 10 ** decimals;
  }

  return {
    address,
    trx: Number.isFinite(trx) ? trx : 0,
    usdt: Number.isFinite(usdt) ? usdt : 0,
    transactions: account.totalTransactionCount ?? "",
    status: "OK"
  };
}

async function main() {
  const apiKey = loadApiKey();
  const inputPath = path.resolve(INPUT_FILE);
  const addresses = readAddresses(inputPath);
  if (!addresses.length) throw new Error("No valid TRON addresses found in the CSV.");

  const completed = readCompleted(OUTPUT_FILE);
  const pending = addresses.filter((address) => !completed.has(address));
  if (!fs.existsSync(OUTPUT_FILE)) {
    fs.writeFileSync(OUTPUT_FILE, "address,trx_balance,usdt_trc20_balance,total_transactions,status\n");
  }

  console.log(`Loaded ${addresses.length.toLocaleString()} unique TRON addresses.`);
  console.log(`${completed.size.toLocaleString()} already completed; ${pending.length.toLocaleString()} remaining.`);
  console.log("Checking public blockchain data only. Recovery phrases are not read.");
  console.log(`Results are saved continuously to ${OUTPUT_FILE}; you can stop and resume later.\n`);

  let next = 0;
  let finished = 0;
  let failures = 0;

  async function worker() {
    while (true) {
      const index = next++;
      if (index >= pending.length) return;
      const address = pending[index];
      let row;
      try {
        row = await checkAddress(address, apiKey);
      } catch (error) {
        failures++;
        row = { address, trx: "", usdt: "", transactions: "", status: `ERROR: ${error.message}` };
      }

      const line = [
        csvCell(row.address),
        csvCell(row.trx),
        csvCell(row.usdt),
        csvCell(row.transactions),
        csvCell(row.status)
      ].join(",") + "\n";
      fs.appendFileSync(OUTPUT_FILE, line);

      finished++;
      const totalDone = completed.size + finished;
      if (finished % 10 === 0 || finished === pending.length) {
        console.log(`Progress: ${totalDone.toLocaleString()}/${addresses.length.toLocaleString()} | errors this run: ${failures}`);
      }
      await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_ADDRESSES_MS));
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, () => worker()));
  console.log(`\nFinished this run. Errors: ${failures}. Results: ${path.resolve(OUTPUT_FILE)}`);
  if (failures) console.log("Run the same command again to retry failed addresses; completed addresses will be skipped.");
}

main().catch((error) => {
  console.error("\nBatch checker error:", error.message);
  process.exitCode = 1;
});
