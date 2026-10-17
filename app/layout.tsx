import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Openlaunch Radar",
  description: "Token activity monitoring for OpenLaunch on Base, Robinhood Chain and Arc.",
  other: {
    "virtual-protocol-site-verification": "0d2654765f157bd13e0b046930b56540"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
