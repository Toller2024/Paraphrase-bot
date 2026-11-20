import fs from "node:fs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

function loadLocalKey() {
  const file = ".env.local";
  if (!fs.existsSync(file)) {
    throw new Error("Missing .env.local. Create it in the project root and add TRONSCAN_API_KEY=your_key");
  }
  const line = fs.readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((value) => /^\s*TRONSCAN_API_KEY\s*=/.test(value));
  const key = line?.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  if (!key || key === "your_key") throw new Error("TRONSCAN_API_KEY is missing in .env.local");
  return key;
}

async function getJson(url, apiKey) {
  const response = await fetch(url, {
    headers: { "TRON-PRO-API-KEY": apiKey, Accept: "application/json" }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`TRONSCAN returned HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response.json();
}

const rl = readline.createInterface({ input, output });
try {
  const apiKey = loadLocalKey();
  const address = (await rl.question("Enter one TRON public address (starts with T): ")).trim();
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
    throw new Error("That does not look like a valid Base58 TRON address.");
  }

  const base = "https://apilist.tronscanapi.com";
  const encoded = encodeURIComponent(address);
  const [account, tokens] = await Promise.all([
    getJson(`${base}/api/accountv2?address=${encoded}`, apiKey),
    getJson(`${base}/api/account/tokens?address=${encoded}&start=0&limit=200&hidden=1&show=2`, apiKey)
  ]);

  const trx = Number(account.balanceStr ?? account.balance ?? 0) / 1_000_000;
  const usdt = (tokens.data ?? []).find((token) =>
    String(token.tokenAbbr).toUpperCase() === "USDT" &&
    String(token.tokenType).toLowerCase() === "trc20"
  );

  console.log("\n--- TRON address report ---");
  console.log("Address:", address);
  console.log("TRX balance:", trx.toLocaleString("en-US", { maximumFractionDigits: 6 }));
  console.log("USDT (TRC20) balance:", usdt?.quantity ?? usdt?.amount ?? "0");
  console.log("Total transactions:", account.totalTransactionCount ?? "Not reported");
  console.log("Activated:", account.activated ?? "Not reported");
  console.log("\nThis report uses public blockchain data. It does not access or need a recovery phrase.");
} catch (error) {
  console.error("\nChecker error:", error.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
