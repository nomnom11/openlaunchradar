export type TokenRow = Record<string, any> & { chain?: string };

export function firstValue(row: TokenRow, keys: string[]) {
  for (const key of keys) {
    const value = key.split(".").reduce((obj: any, part) => obj?.[part], row);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

export function tokenImage(row: TokenRow) {
  const value = firstValue(row, [
    "image_url", "imageUrl", "image", "logoURI", "logoUri",
    "logo_uri", "logo_url", "logoUrl", "icon_url", "iconUrl",
    "token.image", "token.image_url", "token.imageUrl",
    "metadata.image", "metadata.image_url", "metadata.imageUrl",
    "info.imageUrl"
  ]);
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  if (value && typeof value === "object") {
    const nested = firstValue(value, ["url", "src", "uri"]);
    if (typeof nested === "string" && /^https?:\/\//i.test(nested)) return nested;
  }
  return null;
}

export function tokenName(row: TokenRow) {
  return String(firstValue(row, ["name", "token_name", "token.name", "metadata.name", "symbol", "token_symbol"]) ?? "Unknown token");
}
export function tokenSymbol(row: TokenRow) {
  return String(firstValue(row, ["symbol", "token_symbol", "token.symbol", "metadata.symbol"]) ?? "—");
}
export function tokenAddress(row: TokenRow) {
  return String(firstValue(row, ["token", "address", "token_address", "tokenAddress", "contract_address", "token.address"]) ?? `${row.chain || "chain"}-${tokenSymbol(row)}`);
}
export function chainName(chain: any) {
  const c = String(chain || "").toLowerCase();
  if (c.includes("robin")) return "Robinhood";
  if (c.includes("arc")) return "Arc";
  if (c.includes("base")) return "Base";
  return String(chain || "—");
}
export function numeric(row: TokenRow, keys: string[]) {
  const raw = firstValue(row, keys);
  if (raw === null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}
export function money(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 6 : 2, notation: Math.abs(value) >= 100000 ? "compact" : "standard" }).format(value);
}
export function compact(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}
export function percent(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}
export function volumeAll(row: TokenRow) {
  const direct = numeric(row, ["volume_usd", "volumeUsd", "total_volume_usd", "totalVolumeUsd"]);
  if (direct !== null) return direct;

  const quote = numeric(row, ["volume_quote"]);
  const ethUsd = numeric(row, ["quote_usd"]);

  if (quote !== null && ethUsd !== null) {
    return (quote / 1e18) * ethUsd;
  }

  return numeric(row, ["volume_24h_usd", "volume24h_usd", "volume_24h"]);
}

export function radarVolume(row: TokenRow) {
  const all = volumeAll(row);
  const v24 = numeric(row, ["volume_24h_usd", "volume24h_usd", "volume_24h", "volume_usd_24h"]);

  if (all !== null && v24 !== null) return Math.max(all, v24);
  if (all !== null) return all;
  if (v24 !== null) return v24;
  return null;
}

export function volume24h(row: TokenRow) {
  return numeric(row, ["volume_24h_usd", "volume24h_usd", "volume_24h", "volume_usd_24h"]);
}
export function marketCap(row: TokenRow) {
  return numeric(row, ["fdv_usd", "market_cap_usd", "marketCapUsd", "mcap_usd", "fdv"]);
}
export function price(row: TokenRow) {
  return numeric(row, ["price_usd", "priceUsd", "token_price_usd"]);
}
export function buys(row: TokenRow) {
  return numeric(row, ["buys", "buy_count", "buys_24h", "buyCount", "trades_buy"]);
}
export function sells(row: TokenRow) {
  return numeric(row, ["sells", "sell_count", "sells_24h", "sellCount", "trades_sell"]);
}
export function tradeCount(row: TokenRow) {
  return numeric(row, ["trades_24h", "trade_count", "trades", "tx_count", "transactions"]);
}

export function holders(row: TokenRow) {
  return numeric(row, ["holders"]);
}

export function age(row: TokenRow) {
  const start = firstValue(row, ["block_time", "created_at", "launch_time"]);
  if (!start) return null;

  const diff = Date.now() - new Date(start).getTime();
  if (diff < 0) return null;

  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;

  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function trendScore(row: TokenRow): number | null {
  // Transparent activity score based on available OpenLaunch metrics.
  const components: Array<{
    value: number;
    weight: number;
    reference: number;
  }> = [];

  const volume = numeric(row, [
    "volume_usd",
    "volume_24h_usd",
    "volume24h_usd",
    "volume_24h",
  ]);

  const buysCount = numeric(row, [
    "buys",
    "buy_count",
    "buys_24h",
    "buyCount",
  ]);

  const sellsCount = numeric(row, [
    "sells",
    "sell_count",
    "sells_24h",
    "sellCount",
  ]);

  const trades = numeric(row, [
    "trades_24h",
    "trade_count",
    "trades",
    "tx_count",
    "transactions",
  ]);

  const traders = numeric(row, [
    "traders_24h_ex",
    "holders",
  ]);

  if (volume !== null && volume >= 0) {
    components.push({
      value: volume,
      weight: 40,
      reference: 100000,
    });
  }

  const activity =
    (buysCount ?? 0) +
    (sellsCount ?? 0) +
    (trades ?? 0);

  if (activity > 0) {
    components.push({
      value: activity,
      weight: 25,
      reference: 10000,
    });
  }

  if (traders !== null && traders >= 0) {
    components.push({
      value: traders,
      weight: 20,
      reference: 1000,
    });
  }

  if (components.length === 0) return null;

  const score = components.reduce((total, item) => {
    const scaled = Math.min(
      1,
      Math.log10(1 + item.value) /
      Math.log10(1 + item.reference)
    );

    return total + scaled * item.weight;
  }, 0);

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function activityScore(row: TokenRow): number {
  const buysCount = numeric(row, ["buys", "buy_count", "buys_24h", "buyCount"]) ?? 0;
  const sellsCount = numeric(row, ["sells", "sell_count", "sells_24h", "sellCount"]) ?? 0;
  const trades = numeric(row, ["trades_24h", "trade_count", "trades", "tx_count", "transactions"]) ?? 0;
  const holdersCount = numeric(row, ["holders"]) ?? 0;

  const activity = buysCount + sellsCount + trades;

  const score =
    Math.min(100, (Math.log10(1 + activity) / Math.log10(10000)) * 70) +
    Math.min(30, (Math.log10(1 + holdersCount) / Math.log10(1000)) * 30);

  return Math.round(score);
}

export function hotScore(row: TokenRow): number {
  const volume = numeric(row, [
    "volume_usd",
    "volume_24h_usd",
    "volume24h_usd",
    "volume_24h",
  ]) ?? 0;

  const volumeScore = Math.min(
    50,
    (Math.log10(1 + volume) / Math.log10(1000000)) * 50
  );

  return Math.round(volumeScore + (activityScore(row) * 0.5));
}

export function badgeType(row: TokenRow): string {
  const score = hotScore(row);
  const volume = numeric(row, ["volume_usd", "volume_24h_usd"]) ?? 0;

  if (score >= 75) return "HOT";
  if (volume >= 1000000) return "WHALE";
  if (score >= 45) return "ACTIVE";

  const start = firstValue(row, ["block_time", "created_at", "launch_time"]);
  if (start) {
    const days = (Date.now() - new Date(start).getTime()) / 86400000;
    if (days <= 7) return "NEW";
  }

  return "";
}
