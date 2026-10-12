# Openlaunch Radar

OpenLaunch token monitoring dashboard for Base, Robinhood Chain, and Arc. The initial version uses OpenLaunch public JSON endpoints; no API key is required.

## Prasyarat

- Windows 10/11
- Node.js LTS (disarankan Node.js 20 atau 22)
- Visual Studio Code

## Cara menjalankan di VS Code

1. Extract the ZIP into an easy-to-find folder, for example `C:\Projects\openlaunch-radar`.
2. Buka folder tersebut di VS Code: **File → Open Folder**.
3. Buka terminal: **Terminal → New Terminal**.
4. Periksa instalasi:
   ```powershell
   node -v
   npm -v
   ```
   If the command is not found, install Node.js LTS from https://nodejs.org/ then close and reopen VS Code.
5. Di terminal, jalankan:
   ```powershell
   npm install
   npm run dev
   ```
6. Buka http://localhost:3000 di browser.
7. Stop the server with `Ctrl+C`.

## Sumber data

- Daftar token: `GET https://openlaunch.lol/api/launch/list?chain=base&sort=live&window=24h&limit=50`
- Feed: `GET https://openlaunch.lol/api/launch/feed`
- Metadata: `GET https://openlaunch.lol/api/launch/meta/<token>`
- Referensi agent: https://openlaunch.lol/llms.txt

Server fetches each chain list separately through `/api/tokens`, so the browser does not need to call third-party APIs directly.

## Features in the initial version

- Combined table across three chains, search, filters, and sorting.
- The watchlist is stored in browser `localStorage`.
- Refresh otomatis setiap 30 detik.
- Session alerts for volume field increases ≥50% with a difference greater than $100 compared with the previous fetch.
- Trend Score 0–100 based on heuristics explained in the UI.

## Important notes before production use

Public APIs may change, and their responses may contain missing or differently named fields. Normalisasi di `lib/tokens.ts`  intentionally accepts several common field names; check the actual API response if any column displays `—`. Not all APIs provide 30-second volume changes, so alerts in this version compare API-returned values across two polling cycles rather than independently calculating new transaction volume. Avoid refreshing or polling too frequently.

The score is not a machine learning model or price prediction. Do not treat the score as investment advice. Persistent cross-session history and accurate alerts require database snapshot storage and prior validation of the feed/list schema.

## Struktur

```text
openlaunch-radar/
├─ app/
│  ├─ api/tokens/route.ts
│  ├─ api/feed/route.ts
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ lib/tokens.ts
├─ package.json
└─ README.md
```
