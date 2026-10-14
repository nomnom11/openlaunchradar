import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE = process.env.OPENLAUNCH_API_BASE || "https://openlaunch.lol";
const CHAINS = ["base", "robinhood", "arc"] as const;
const PAGE_SIZE = 100;
const MAX_PAGES = 30;

async function getChain(chain: string) {
  const tokens: any[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const params = new URLSearchParams({
      chain,
      sort: "volume",
      window: "24h",
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });

    const url = `${BASE}/api/launch/list?${params.toString()}`;
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`OpenLaunch API ${chain}: HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload)
      ? payload
      : payload?.launches ??
        payload?.tokens ??
        payload?.items ??
        payload?.data ??
        [];

    if (!Array.isArray(rows)) {
      throw new Error(`Unrecognized token list format for ${chain}.`);
    }

    const validRows = rows.filter(
      (row: any) => row && typeof row === "object" && !Array.isArray(row)
    );

    tokens.push(
      ...validRows.map((row: any) => ({
        ...row,
        chain: row.chain || chain,
      }))
    );

    if (
      validRows.length === 0 ||
      !payload?.has_more ||
      validRows.length < PAGE_SIZE
    ) {
      break;
    }
  }

  return tokens;
}

export async function GET() {
  const results = await Promise.allSettled(CHAINS.map(getChain));

  const tokens = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  const errors = results.flatMap((result, index) =>
    result.status === "rejected"
      ? [
          `${CHAINS[index]}: ${String(
            result.reason?.message || result.reason
          )}`,
        ]
      : []
  );

  tokens.sort((a: any, b: any) => Number(b.volume_24h_usd ?? 0) - Number(a.volume_24h_usd ?? 0));

  if (!tokens.length) {
    return NextResponse.json(
      {
        tokens: [],
        errors: errors.length
          ? errors
          : ["OpenLaunch returned no token data."],
        source: `${BASE}/api/launch/list`,
        fetchedAt: new Date().toISOString(),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    tokens,
    errors,
    source: `${BASE}/api/launch/list`,
    fetchedAt: new Date().toISOString(),
  });
}
