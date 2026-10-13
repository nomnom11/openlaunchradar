 "use client";

import Image from "next/image";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { age, buys, holders, chainName, compact, marketCap, money, price, sells, tokenAddress, tokenName, tokenSymbol, tradeCount, trendScore, hotScore, badgeType, riskSignal, volumeAll, radarVolume, volume24h, momentum24h, tokenImage, type TokenRow } from "@/lib/tokens";

type ApiResponse = { tokens: TokenRow[]; errors?: string[]; source?: string; fetchedAt?: string };
type HistoryPoint = { time: string; timestamp: number; volume: number };
type TokenHistory = Record<string, HistoryPoint[]>;

export default function Home() {
  const [data, setData] = useState<ApiResponse>({ tokens: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chain, setChain] = useState("all");
  const [sort, setSort] = useState("volume");
  const [search, setSearch] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchOnly, setWatchOnly] = useState(false);
  const [hotOnly, setHotOnly] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;
  const [alerts, setAlerts] = useState<string[]>([]);
  const lastValuesRef = useRef<Record<string, number>>({});
  const [updatedAt, setUpdatedAt] = useState("");
  const [history, setHistory] = useState<TokenHistory>({});
  const [historyReady, setHistoryReady] = useState(false);
  const [selectedHistoryToken, setSelectedHistoryToken] = useState("");
  const [newTokenIds, setNewTokenIds] = useState<string[]>([]);
  const previousTokenIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    try { setWatchlist(JSON.parse(localStorage.getItem("openlaunch-radar-watchlist") || "[]")); } catch {}
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("openlaunch-radar-history") || "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) setHistory(saved);
    } catch { }
    finally { setHistoryReady(true); }
  }, []);

  useEffect(() => {
    if (historyReady) {
      try { localStorage.setItem("openlaunch-radar-history", JSON.stringify(history)); } catch (e) { console.warn("Could not save radar history", e); }
    }
  }, [history, historyReady]);
  useEffect(() => { localStorage.setItem("openlaunch-radar-watchlist", JSON.stringify(watchlist)); }, [watchlist]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/tokens", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok && !result.tokens?.length) throw new Error((result.errors || ["Failed to fetch OpenLaunch data."]).join(" · "));
      const rows: TokenRow[] = result.tokens || [];
      const snapshotTime = Date.now();
      setHistory((previous) => {
        const next = { ...previous };
        for (const row of rows) {
          const v = volumeAll(row);
          if (v === null || !Number.isFinite(v) || v < 0) continue;
          const id = `${row.chain}:${tokenAddress(row)}`;
          const points = next[id] || [];
          if (points.length && snapshotTime - points[points.length - 1].timestamp < 25000) continue;
          next[id] = [...points, { timestamp: snapshotTime, time: new Date(snapshotTime).toLocaleTimeString(), volume: v }].slice(-120);
        }
        return next;
      });
      const currentIds = new Set(rows.map((row) => `${row.chain}:${tokenAddress(row)}`));
      if (previousTokenIdsRef.current !== null) {
        const discovered = [...currentIds].filter((id) => !previousTokenIdsRef.current!.has(id));
        if (discovered.length) setNewTokenIds((old) => [...new Set([...old, ...discovered])]);
      }
      previousTokenIdsRef.current = currentIds;
      const newAlerts: string[] = [];
      const nextValues: Record<string, number> = {};
      rows.forEach((row) => {
        const id = `${row.chain}:${tokenAddress(row)}`;
        const v = volumeAll(row);
        if (v !== null) {
          nextValues[id] = v;
          const old = lastValuesRef.current[id];
          if (old && v >= old * 1.5 && v - old > 100) newAlerts.push(`${tokenSymbol(row)}: reported volume increased by ≥50% compared with the previous fetch.`);
        }
      });
      if (newAlerts.length) setAlerts((old) => [...newAlerts, ...old].slice(0, 8));
      lastValuesRef.current = nextValues;
      setData(result);
      setError("");
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e?.message || "Unable to fetch data.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);

  useEffect(() => { setPage(1); }, [chain, search, watchOnly, hotOnly, sort]);

  const historyTokenIds = useMemo(() => Object.keys(history).filter((id) => (history[id] || []).length > 0), [history]);
  const activeHistoryId = historyTokenIds.includes(selectedHistoryToken) ? selectedHistoryToken : (historyTokenIds[0] || "");
  const historyChartData = useMemo(() => (history[activeHistoryId] || []).map((point) => ({ time: point.time, volume: point.volume })), [history, activeHistoryId]);

  const rows = useMemo(() => {
    let filtered = data.tokens.filter((row) => {
      const id = `${row.chain}:${tokenAddress(row)}`;
      const matchesChain = chain === "all" || String(row.chain).toLowerCase().includes(chain);
      const query = `${tokenName(row)} ${tokenSymbol(row)} ${tokenAddress(row)}`.toLowerCase();
      return matchesChain && query.includes(search.toLowerCase()) && (!watchOnly || watchlist.includes(id)) && (!hotOnly || badgeType(row).includes("HOT"));
    });
    filtered.sort((a, b) => {
      if (sort === "volume") { const priority = (row: TokenRow) => { const m24 = momentum24h(row); const activePenalty = m24 <= 0 ? -5000000 : 0; return m24 * 1000000 + hotScore(row) * 10000 + (radarVolume(row) ?? 0) + activePenalty; }; return priority(b) - priority(a); }
      if (sort === "mcap") return (marketCap(b) ?? -1) - (marketCap(a) ?? -1);
      if (sort === "trades") return (tradeCount(b) ?? -1) - (tradeCount(a) ?? -1);
      const scoreA = trendScore(a);
      const scoreB = trendScore(b);
      if (scoreA === null) return scoreB === null ? 0 : 1;
      if (scoreB === null) return -1;
      return scoreB - scoreA;
    });
    return filtered;
  }, [data, chain, search, watchOnly, watchlist, sort, hotOnly]);

  const totalVolume = data.tokens.reduce((sum, row) => sum + (radarVolume(row) ?? 0), 0);
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const paginatedRows = rows.slice((page - 1) * perPage, page * perPage);
  const toggleWatch = (id: string) => setWatchlist((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old, id]);

  return <main className="shell">
    <aside className="premium-sidebar"><a className="side-brand" href="#"><Image src="/logo.png" alt="OpenLaunch" width={34} height={34} priority/><span>OPENLAUNCH<small>RADAR TERMINAL</small></span></a><p className="side-label">WORKSPACE</p><a className="side-link active" href="#radar">◈ <span>Live Radar</span></a><a className="side-link" href="#watchlist">☆ <span>Watchlist</span></a><a className="side-link" href="#history">⌁ <span>Volume History</span></a><p className="side-label">ANALYTICS</p><a className="side-link" href="#alerts">↗ <span>Activity Alerts</span></a><a className="side-link" href="#scoring">◎ <span>Scoring Model</span></a><div className="sidebar-bottom"><span className="live-dot"/> API MONITOR<small>Refreshes every 30 seconds</small></div></aside>
    <div className="dashboard-main">
    <header className="topbar">
      
<a className="brand" href="#">
  <Image className="brand-logo" src="/logo.png" alt="Openlaunch Radar logo" width={42} height={42} priority />
  <span>OPENLAUNCH <b>RADAR</b><small>ON-CHAIN TREND MONITOR</small></span>
</a>

      <div className="top-right"><span className="live-dot" /> <span>PUBLIC API</span><button className="refresh" onClick={load}>↻ Refresh</button></div>
    </header>

    <section className="hero">
      <div>
        <p className="eyebrow">MARKET INTELLIGENCE / MULTI-CHAIN</p>
        <h1>Find momentum <span>before the crowd.</span></h1>
        <p className="hero-copy">Track tokens across Base, Robinhood Chain, and Arc using public data. The trend score is a transparent heuristic, not a price prediction.</p>
        <div className="hero-status"><span className="pulse" /> LIVE MONITORING <small>Auto-refresh every 30 seconds</small></div>
      </div>
    </section>

    <section className="stats">
      <div className="stat"><span>TRACKED TOKENS</span><strong>{data.tokens.length}</strong><small>Combined across 3 chains</small></div>
      <div className="stat"><span>VOLUME · ALL USD</span><strong>{money(totalVolume)}</strong><small>Sum of available volume fields</small></div>
      <div className="stat"><span>WATCHLIST</span><strong>{watchlist.length.toString().padStart(2, "0")}</strong><small>Saved in this browser</small></div>
      <div className="stat"><span>LAST UPDATED</span><strong className="time-stat">{updatedAt || "—"}</strong><small>{loading ? "Fetching data..." : "Refresh status"}</small></div>
    </section>

    <section className="section-head"><div><p className="eyebrow">RADAR SCANNER</p><h2>Token explorer <span className="count">{rows.length} results</span></h2></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="watch-filter" onClick={() => { const blob = new Blob([JSON.stringify(data.tokens.filter((row) => watchlist.includes(`${row.chain}:${tokenAddress(row)}`)).map((row) => ({name: row.name ?? row.token_name ?? row.symbol ?? "Unknown token", symbol: row.symbol ?? row.token_symbol ?? "—", chain: row.chain ?? "—", address: row.token ?? row.address ?? row.token_address ?? row.tokenAddress ?? row.contract_address ?? null, price_usd: row.price_usd ?? row.priceUsd ?? row.token_price_usd ?? null, volume_24h_usd: row.volume_24h_usd ?? row.volume24h_usd ?? row.volume_24h ?? row.volume_usd_24h ?? null, market_cap_usd: row.fdv_usd ?? row.market_cap_usd ?? row.marketCapUsd ?? row.mcap_usd ?? row.fdv ?? null, trend_score: trendScore(row)})), null, 2)], {type:"application/json"}); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "openlaunch-watchlist.json"; a.click(); URL.revokeObjectURL(url); }}>Export Watchlist</button><button className={`watch-filter ${watchOnly ? "selected" : ""}`} onClick={() => setWatchOnly(!watchOnly)}>☆ {watchOnly ? "Watchlist enabled" : "Watchlist"}</button></div></section>
    <section className="filters">
      <label className="searchbox">⌕ <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, ticker, or address..." /></label>
      <div className="hot-filter"><button type="button" className={!hotOnly ? "active" : ""} onClick={() => setHotOnly(false)}>All Tokens</button><button type="button" className={hotOnly ? "active" : ""} onClick={() => setHotOnly(true)}>HOT Only</button></div>
      <select value={chain} onChange={(e) => setChain(e.target.value)} aria-label="Select chain"><option value="all">All chains</option><option value="base">Base</option><option value="robinhood">Robinhood Chain</option><option value="arc">Arc</option></select>
      <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tokens"><option value="volume">Volume · All</option><option value="score">Trend Score</option><option value="mcap">Market cap Since launch</option><option value="trades">Trade count</option></select>
    </section>

    {error && <div className="notice error"><b>API data could not be loaded.</b><p>{error}</p><small>Check your internet connection, then click Refresh. The OpenLaunch API is an external data source.</small></div>}
    {data.errors?.length > 0 && <div className="notice warning"><b>Some chains could not be fetched.</b><p>{data.errors.join(" · ")}</p></div>}

    <section className="table-wrap" id="radar">
      <div className="table-scroll"><table>
        <thead><tr><th># / TOKEN</th><th>CHAIN</th><th>PRICE USD</th><th>MARKET CAP SINCE LAUNCH</th><th>VOLUME · ALL</th><th>VOLUME 24H</th><th>BUYS / SELLS</th><th>HOLDERS</th><th>AGE</th><th>TREND SCORE</th><th></th></tr></thead>
        <tbody>
          {paginatedRows.map((row, index) => {
            const id = `${row.chain}:${tokenAddress(row)}`;
            const b = buys(row), s = sells(row);
            const ch = chainName(row.chain);
            const address = tokenAddress(row);
            return <tr key={id}>
              <td><div className="token-cell"><span className="rank">{String(index + 1).padStart(2, "0")}</span><Image className="token-avatar" src={tokenImage(row) || "/token-placeholder.svg"} alt={tokenSymbol(row)} width={34} height={34} unoptimized onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/token-placeholder.svg"; }} /><div><strong>{tokenName(row)}</strong>{badgeType(row).includes("HOT") && <span className="hot-badge">HOT</span>}{riskSignal(row) === "HEALTHY" && <span className="healthy-badge">HEALTHY</span>}{riskSignal(row) === "WATCH" && <span className="watch-badge">WATCH</span>}{riskSignal(row) === "RISK" && <span className="risk-badge">RISK</span>}{badgeType(row).includes("WHALE") && <span className="whale-badge">WHALE</span>}{badgeType(row).includes("ACTIVE") && <span className="active-badge">ACTIVE</span>}{badgeType(row).includes("NEW") && <span className="new-badge">NEW</span>}{newTokenIds.includes(id) && <span className="new-badge">NEW</span>}<small>{tokenSymbol(row)} · {address.length > 18 ? `${address.slice(0, 7)}…${address.slice(-5)}` : address}</small></div></div></td>
              <td><span className={`chain-badge ${ch.toLowerCase()}`}>{ch}</span></td>
              <td className="numeric">{money(price(row))}</td>
              <td className="numeric">{money(marketCap(row))}</td>
              <td className="numeric">{money(volumeAll(row))}</td>
              <td className="numeric">{money(volume24h(row))}</td>
              <td><span className="buy">{b === null ? "—" : compact(b)}</span><span className="muted"> / </span><span className="sell">{s === null ? "—" : compact(s)}</span></td>
              <td className="numeric">{compact(holders(row))}</td>
              <td className="numeric">{age(row) ?? "—"}</td>
              <td><div className="score-cell"><strong>{trendScore(row) ?? "—"}</strong><span className="score-track"><i style={{ width: `${trendScore(row) ?? 0}%` }} /></span></div></td>
              <td><button className={`star ${watchlist.includes(id) ? "on" : ""}`} title="Add/remove from watchlist" onClick={() => toggleWatch(id)}>{watchlist.includes(id) ? "★" : "☆"}</button></td>
            </tr>;
          })}
          {!rows.length && <tr><td colSpan={9} className="empty">{loading ? "Fetching token data from OpenLaunch..." : "No tokens match the current filters. If the API failed, check the message above."}</td></tr>}
        </tbody>
      </table></div>
      <div className="table-footer"><span>Showing {rows.length === 0 ? 0 : ((page - 1) * perPage) + 1}-{Math.min(page * perPage, rows.length)} of {rows.length} tokens</span><span><button className="watch-filter" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>◀ Previous</button> <b> Page {page} / {totalPages} </b> <button className="watch-filter" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next ▶</button></span></div>
      <footer className="table-footer"><span>Source: <a href="https://openlaunch.lol/agents" target="_blank" rel="noreferrer">OpenLaunch public JSON API ↗</a></span><span>Last refresh: {updatedAt || "Not available yet"}</span></footer>
    </section>


    <section className="panel history-panel" id="history">
      <div className="panel-head"><div><p className="eyebrow">VOLUME HISTORY</p><h3>Token volume over time</h3></div><span className="model-tag">LOCAL</span></div>
      <p className="panel-copy">Token volume snapshots collected while the radar is running.</p>
      <select value={activeHistoryId} onChange={(e) => setSelectedHistoryToken(e.target.value)} disabled={!historyTokenIds.length}>
        {historyTokenIds.map((id) => { const row = data.tokens.find((item) => `${item.chain}:${tokenAddress(item)}` === id); return <option key={id} value={id}>{row ? `${tokenName(row)} (${tokenSymbol(row)})` : id}</option>; })}
      </select>
      <span className="counter">{historyChartData.length} points</span>
      {historyChartData.length >= 2 ? <div style={{width:"100%",height:280}}><ResponsiveContainer width="100%" height="100%"><AreaChart data={historyChartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="time"/><YAxis tickFormatter={(v) => compact(v)}/><Tooltip formatter={(v) => [money(Number(v)), "Volume"]}/><Area type="monotone" dataKey="volume" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.18}/></AreaChart></ResponsiveContainer></div> : <div className="empty-small">Collecting volume history.<small>Keep this page open for multiple refreshes.</small></div>}
    </section>
\n    <section className="bottom-grid" id="alerts">
      <div className="panel"><div className="panel-head"><div><p className="eyebrow">RADAR AGENT</p><h3>Activity alerts</h3></div><span className="counter">{alerts.length}</span></div><p className="panel-copy">Local alerts are generated when the API-returned volume field increases by ≥50% and the difference exceeds $100 between fetches. This is not hourly volume history from the provider.</p>
        {alerts.length ? <ul className="alerts">{alerts.map((a, i) => <li key={`${a}-${i}`}><span className="alert-icon">↗</span>{a}</li>)}</ul> : <div className="empty-small">No spikes detected in this session yet.<small>Alerts become active after at least two data fetches.</small></div>}
        <button className="text-button" onClick={() => setAlerts([])}>Clear alerts</button>
      </div>
      <div className="panel" id="scoring"><div className="panel-head"><div><p className="eyebrow">SCORING MODEL</p><h3>How Trend Score Is Calculated</h3></div><span className="model-tag">v0.1</span></div>
        <div className="formula"><div><span>Volume 24h USD</span><b>Log scale · 40 pts · ref $1,000</b></div><div><span>Traders in 24h</span><b>Log scale · 30 pts · ref 10</b></div><div><span>Transactions in 24h</span><b>Log scale · 30 pts · ref 10</b></div></div>
        <p className="disclaimer">Scores range from 0–100. Missing fields are not treated as actual data; this score is an activity indicator, not a token-buying recommendation.</p>
      </div>
    </section>
    <footer className="page-footer"><span>OPENLAUNCH RADAR <b>·</b> EARLY ACCESS</span><span>Data provided by OpenLaunch. Not financial advice.</span></footer>
    </div>
  </main>;
}
