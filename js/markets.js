/* ==========================================================================
   markets.js — Markets data provider + rendering
   ==========================================================================
   INTEGRATION POINT: replace `fetchMarkets()` with a live quote API (IEX
   Cloud, Finnhub, Alpha Vantage, your brokerage's API, etc). Keep the
   returned shape: { indices[], watchlist[], portfolio }.
   ========================================================================== */

async function fetchMarkets() {
  const res = await fetch("data/markets.json");
  return res.json();
}

function fmtUsd(n) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export async function getMarketsSummary() {
  const data = await fetchMarkets();
  const p = data.portfolio;
  const basis = p.shares * p.basisPerShare;
  const currentValue = p.shares * p.currentPrice;
  const gainLoss = currentValue - basis;
  const gainLossPct = (gainLoss / basis) * 100;
  return { ...data, portfolioComputed: { basis, currentValue, gainLoss, gainLossPct } };
}

function changePill(pct, priceChange) {
  const up = pct >= 0;
  const amount = priceChange != null ? `${up ? "+" : ""}${priceChange.toFixed(2)} ` : "";
  return `<span class="market-change ${up ? "is-up" : "is-down"}">${amount}${up ? "+" : ""}${pct.toFixed(2)}%</span>`;
}

// NYSE regular hours, roughly (9:30am - 4:00pm America/New_York, Mon-Fri).
// INTEGRATION POINT: swap for a real market-status API if you need holiday accuracy.
export function isMarketOpen(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekday = get("weekday");
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  const minutesNow = hour * 60 + minute;
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  return isWeekday && minutesNow >= 9 * 60 + 30 && minutesNow < 16 * 60;
}

export function renderIndices(container, summary) {
  container.innerHTML = "";
  [...summary.indices, ...summary.watchlist].forEach((row) => {
    const el = document.createElement("div");
    el.className = "market-row";
    const dotColor = row.changePct >= 0 ? "var(--accent-markets)" : "var(--accent-markets-down)";
    el.innerHTML = `
      <span class="market-name-wrap">
        <span class="swatch" style="background:${dotColor}"></span>
        <span class="market-name">${row.name}</span>
      </span>
      <span class="market-values">
        <span class="market-price">${row.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        ${changePill(row.changePct)}
      </span>
    `;
    container.appendChild(el);
  });
}

export function renderPortfolio(container, summary) {
  const { portfolio, portfolioComputed } = summary;
  const gainUp = portfolioComputed.gainLoss >= 0;
  container.innerHTML = `
    <div class="portfolio-card-title">${portfolio.symbol} Portfolio</div>
    <div class="portfolio-card-sub">${portfolio.shares} shares · Basis ${fmtUsd(portfolio.basisPerShare)}</div>
    <div class="portfolio-card-row">
      <span class="label">Value</span>
      <span class="value">${fmtUsd(portfolioComputed.currentValue)}</span>
    </div>
    <div class="portfolio-card-row">
      <span class="label">Net Gain</span>
      <span class="value" style="color:${gainUp ? "var(--accent-markets)" : "var(--accent-markets-down)"}">
        ${gainUp ? "+" : ""}${fmtUsd(portfolioComputed.gainLoss)} (${gainUp ? "+" : ""}${portfolioComputed.gainLossPct.toFixed(1)}%)
      </span>
    </div>
  `;
}
