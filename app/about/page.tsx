import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="about-page">
      <h1>About OpenLaunch Radar</h1>

      <p>
        OpenLaunch Radar is a token discovery dashboard designed to monitor
        newly launched tokens and identify early market activity signals.
      </p>

      <h2>How It Works</h2>

      <p>
        The radar analyzes multiple market indicators to rank tokens based on
        current activity and market participation.
      </p>

      <h3>Confidence Score</h3>
      <p>
        Confidence measures the strength of token activity using factors such
        as trading volume, buyer activity, holders, and market participation.
      </p>

      <h3>Flow Signal</h3>
      <p>
        Flow Signal shows current buying and selling pressure:
      </p>

      <ul>
        <li>STRONG BUY FLOW — strong buying activity</li>
        <li>BUY PRESSURE — buyers are currently stronger</li>
        <li>NEUTRAL — balanced activity</li>
        <li>SELL PRESSURE — sellers are stronger</li>
        <li>STRONG SELL FLOW — strong selling activity</li>
      </ul>

      <h3>Ranking Reasons</h3>
      <p>
        Each token displays the reasons why it appears in the radar, such as
        strong volume, positive buy pressure, active buyers, and holder health.
      </p>

      <h2>Disclaimer</h2>

      <p>
        OpenLaunch Radar provides market data analysis and activity signals.
        It does not provide financial advice and does not guarantee future
        token performance.
      </p>

      <Link href="/">
        Back to Radar
      </Link>
    </main>
  );
}
