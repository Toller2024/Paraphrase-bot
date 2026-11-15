const CHAINS = {
  bitcoin: { network: "Bitcoin mainnet", symbol: "BTC", source: "mempool.space public API", priceId: "bitcoin" },
  ethereum: { network: "Ethereum mainnet", symbol: "ETH", source: "Cloudflare Ethereum public RPC", priceId: "ethereum" },
  bsc: { network: "BNB Smart Chain mainnet", symbol: "BNB", source: "BNB Chain public RPC", priceId: "binancecoin" },
  polygon: { network: "Polygon mainnet", symbol: "POL", source: "Polygon public RPC", priceId: "polygon-ecosystem-token" },
  tron: { network: "TRON mainnet", symbol: "TRX", source: "TronGrid public API", priceId: "tron" },
};

export function classifyUsdExposure(usdValue) {
  if (!Number.isFinite(usdValue) || usdValue < 0) throw new Error("A valid USD estimate is required.");
  if (usdValue > 100000) return "HIGH EXPOSURE";
  if (usdValue > 1000) return "MODERATE EXPOSURE";
  if (usdValue > 500) return "LOW EXPOSURE";
  return "STANDARD";
}

function validateAddress(chain, address) {
  if (chain === "bitcoin") return /^(bc1[ac-hj-np-z02-9]{11,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(address);
  if (["ethereum", "bsc", "polygon"].includes(chain)) return /^0x[0-9a-fA-F]{40}$/.test(address);
  if (chain === "tron") return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  return false;
}
async function jsonRpc(url, method, params) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  if (!response.ok) throw new Error(`Blockchain provider returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (payload.error || typeof payload.result !== "string") throw new Error("Blockchain provider did not return a valid balance response.");
  return BigInt(payload.result);
}
async function fetchUsdPrice(priceId) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(priceId)}&vs_currencies=usd`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Live USD price is unavailable; no exposure category was calculated.");
  const payload = await response.json();
  const price = payload?.[priceId]?.usd;
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    throw new Error("Live USD price is unavailable; no exposure category was calculated.");
  }
  return price;
}
export async function fetchPublicAddressBalance(chain, address) {
  if (!CHAINS[chain]) throw new Error("Select a supported blockchain.");
  if (!validateAddress(chain, address)) throw new Error("The address format does not match the selected blockchain.");
  let units;
  if (chain === "bitcoin") {
    const response = await fetch(`https://mempool.space/api/address/${encodeURIComponent(address)}`);
    if (!response.ok) throw new Error(`Bitcoin data provider returned HTTP ${response.status}.`);
    const data = await response.json();
    const funded = BigInt(data.chain_stats?.funded_txo_sum ?? 0) + BigInt(data.mempool_stats?.funded_txo_sum ?? 0);
    const spent = BigInt(data.chain_stats?.spent_txo_sum ?? 0) + BigInt(data.mempool_stats?.spent_txo_sum ?? 0);
    units = { value: funded - spent, decimals: 8 };
  } else if (chain === "ethereum") {
    units = { value: await jsonRpc("https://cloudflare-eth.com", "eth_getBalance", [address, "latest"]), decimals: 18 };
  } else if (chain === "bsc") {
    units = { value: await jsonRpc("https://bsc-dataseed.binance.org", "eth_getBalance", [address, "latest"]), decimals: 18 };
  } else if (chain === "polygon") {
    units = { value: await jsonRpc("https://polygon-rpc.com", "eth_getBalance", [address, "latest"]), decimals: 18 };
  } else {
    const response = await fetch("https://api.trongrid.io/wallet/getaccount", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, visible: true }) });
    if (!response.ok) throw new Error(`TRON data provider returned HTTP ${response.status}.`);
    const data = await response.json();
    if (!data || !Object.keys(data).length) units = { value: 0n, decimals: 6 };
    else if (data.balance === undefined) throw new Error("TRON provider returned no account balance. The account may not be activated or the provider may restrict access.");
    else units = { value: BigInt(data.balance), decimals: 6 };
  }
  const divisor = 10n ** BigInt(units.decimals);
  const whole = units.value / divisor;
  const fraction = (units.value % divisor).toString().padStart(units.decimals, "0").replace(/0+$/, "");
  const balance = fraction ? `${whole}.${fraction}` : whole.toString();
  const usdPrice = await fetchUsdPrice(CHAINS[chain].priceId);
  const usdValue = Number(balance) * usdPrice;
  return {
    network: CHAINS[chain].network,
    symbol: CHAINS[chain].symbol,
    address,
    source: CHAINS[chain].source,
    balance,
    exposureTier: classifyUsdExposure(usdValue),
    priceSource: "CoinGecko live USD spot quote",
    checkedAt: new Date().toISOString(),
  };
}
