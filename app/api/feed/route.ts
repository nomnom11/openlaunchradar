import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  const base = process.env.OPENLAUNCH_API_BASE || "https://openlaunch.lol";
  try {
    const response = await fetch(`${base}/api/launch/feed`, { cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return NextResponse.json({ data, fetchedAt: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ data: null, error: error?.message || "Feed is unavailable" }, { status: 502 });
  }
}
