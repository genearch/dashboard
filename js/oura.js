/* ==========================================================================
   oura.js — Health data provider (readiness + trend rings)
   ==========================================================================
   INTEGRATION POINT: replace `fetchDays()` with a live call to your health
   MCP / Oura Cloud API. Expected shape per day: { date, totalSleepMinutes,
   sleepEfficiency, deepSleepMinutes, remSleepMinutes, awakeMinutes, hrv,
   restingHR }. Readiness is computed client-side from real inputs, not
   hard-coded, so it keeps working once you swap the source.

   Each of the 4 rings (Readiness / Sleep / HRV / Resting HR) packs two
   things into one circle: a thick inner arc showing today's value, and a
   ring of 14 thin radial ticks around the outside showing the last 14
   days' shape (today's tick is highlighted). No separate chart needed.
   ========================================================================== */

async function fetchDays() {
  const res = await fetch(`data/oura.json?t=${Date.now()}`, { cache: "no-store" });
  const json = await res.json();
  return json.days;
}

function mean(nums) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdev(nums) {
  const m = mean(nums);
  return Math.sqrt(mean(nums.map((n) => (n - m) ** 2))) || 1;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// Composite readiness: blends last-night sleep efficiency against a 7-day
// HRV/RHR baseline, mirroring how ring-based readiness scores are derived
// (higher HRV vs. baseline is good, higher RHR vs. baseline is bad).
function computeReadiness(days) {
  const last = days[days.length - 1];
  const baseline = days.slice(0, -1);

  const hrvBaseline = baseline.filter((d) => d.hrvSource === last.hrvSource);
  const rhrBaseline = baseline.filter((d) => d.restingHRSource === last.restingHRSource);

  let hrvScore = 50;
  if (hrvBaseline.length >= 2) {
    const m = mean(hrvBaseline.map((d) => d.hrv));
    const sd = stdev(hrvBaseline.map((d) => d.hrv));
    hrvScore = clamp(50 + ((last.hrv - m) / sd) * 15, 0, 100);
  }

  let rhrScore = 50;
  if (rhrBaseline.length >= 2) {
    const m = mean(rhrBaseline.map((d) => d.restingHR));
    const sd = stdev(rhrBaseline.map((d) => d.restingHR));
    rhrScore = clamp(50 - ((last.restingHR - m) / sd) * 15, 0, 100);
  }

  const sleepScore = clamp(last.sleepEfficiency, 0, 100);

  const composite = sleepScore * 0.5 + hrvScore * 0.25 + rhrScore * 0.25;
  return Math.round(clamp(composite, 0, 100));
}

// Causal per-day readiness series (each day only "sees" itself + prior days),
// used to draw the readiness ring's 14-day trend ticks.
function computeReadinessSeries(days) {
  return days.map((_, i) => computeReadiness(days.slice(0, i + 1)));
}

export async function getOuraSummary() {
  const days = await fetchDays();
  const last = days[days.length - 1];
  const readiness = computeReadiness(days);
  return { days, last, readiness };
}

export function readinessLabel(score) {
  if (score >= 85) return "Optimal";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Pay attention";
}

function readinessColor(score) {
  if (score >= 70) return "var(--accent-markets)";
  if (score >= 50) return "var(--accent-weather)";
  return "var(--accent-health)";
}

/* ---------------------------------------------------------------------- *
 * Ring builder — one SVG per metric: thick inner arc (today) + 14 thin
 * radial ticks around the rim (trend). `series` is the raw 14-day values
 * used for the tick heights (min/max-normalized); `pct` is the 0–1 fill
 * for the inner arc (usually scaled against a meaningful target/range).
 * ---------------------------------------------------------------------- */

function ringSVG({ pct, color, gradient }) {
  // Clean solid ring only — no radial tick marks. An earlier version drew
  // 14 spiky lines around the rim to show the trend "in the ring," but it
  // read as visually busy/cluttered in practice. The trend now lives in
  // the delta text under the ring instead (see buildRingItem).
  const r = 30;
  const c = 2 * Math.PI * r;
  const dash = `${c * clamp(pct, 0, 1)} ${c}`;

  const gradientDef = gradient
    ? `<defs><linearGradient id="${gradient.id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${gradient.from}" /><stop offset="100%" stop-color="${gradient.to}" /></linearGradient></defs>`
    : "";
  const strokeColor = gradient ? `url(#${gradient.id})` : color;

  return `
    <svg viewBox="0 0 100 100">
      ${gradientDef}
      <circle class="ring-track" cx="50" cy="50" r="${r}"></circle>
      <circle class="ring-value" cx="50" cy="50" r="${r}" stroke="${strokeColor}" stroke-dasharray="${dash}"></circle>
    </svg>
  `;
}

function deltaLabel(current, baselineArr, { unit = "", decimals = 0, invert = false } = {}) {
  if (!baselineArr.length) return { text: "—", color: "var(--color-text-tertiary)" };
  const avg = mean(baselineArr);
  const diff = current - avg;
  if (Math.abs(diff) < 0.05) return { text: "steady", color: "var(--color-text-tertiary)" };
  const good = invert ? diff < 0 : diff > 0;
  const arrow = diff > 0 ? "▲" : "▼";
  const text = `${arrow}${Math.abs(diff).toFixed(decimals)}${unit}`;
  return { text, color: good ? "var(--accent-markets)" : "var(--accent-health)" };
}

export function renderOuraRings(container, summary) {
  const { days, last, readiness } = summary;
  const baseline = days.slice(0, -1);

  container.innerHTML = "";

  // Readiness
  const readinessSeries = computeReadinessSeries(days);
  const readinessBaseline = readinessSeries.slice(0, -1);
  const readinessDelta = deltaLabel(readiness, readinessBaseline, { decimals: 0 });
  const readinessItem = buildRingItem({
    svg: ringSVG({
      pct: readiness / 100,
      series: readinessSeries,
      gradient: { id: "readinessGrad", from: "var(--accent-markets)", to: "var(--accent-calendar)" },
    }),
    number: readiness,
    unit: readinessLabel(readiness),
    unitColor: readinessColor(readiness),
    delta: readinessDelta,
    label: "Readiness",
  });

  // Sleep
  const sleepSeries = days.map((d) => d.totalSleepMinutes);
  const sleepHrs = Math.floor(last.totalSleepMinutes / 60);
  const sleepMin = last.totalSleepMinutes % 60;
  const sleepDelta = deltaLabel(last.totalSleepMinutes / 60, baseline.map((d) => d.totalSleepMinutes / 60), { unit: "h", decimals: 1 });
  const sleepItem = buildRingItem({
    svg: ringSVG({ pct: last.totalSleepMinutes / 480, series: sleepSeries, color: "var(--accent-calendar)" }),
    number: `${sleepHrs}h${sleepMin}`,
    unit: "sleep",
    delta: sleepDelta,
    label: "Sleep",
  });

  // HRV
  const hrvSeries = days.map((d) => d.hrv);
  const hrvMin = Math.min(...hrvSeries);
  const hrvMax = Math.max(...hrvSeries);
  const hrvDelta = deltaLabel(last.hrv, baseline.map((d) => d.hrv), { unit: "ms", decimals: 0 });
  const hrvItem = buildRingItem({
    svg: ringSVG({ pct: (last.hrv - hrvMin) / ((hrvMax - hrvMin) || 1), series: hrvSeries, color: "var(--accent-markets)" }),
    number: Math.round(last.hrv),
    unit: "ms",
    delta: hrvDelta,
    label: "HRV",
  });

  // Resting HR
  const rhrSeries = days.map((d) => d.restingHR);
  const rhrMin = Math.min(...rhrSeries);
  const rhrMax = Math.max(...rhrSeries);
  const rhrPct = 1 - (last.restingHR - rhrMin) / ((rhrMax - rhrMin) || 1);
  const rhrDelta = deltaLabel(last.restingHR, baseline.map((d) => d.restingHR), { unit: " bpm", decimals: 0, invert: true });
  const rhrItem = buildRingItem({
    svg: ringSVG({ pct: rhrPct, series: rhrSeries, color: "var(--accent-health)" }),
    number: Math.round(last.restingHR),
    unit: "bpm",
    delta: rhrDelta,
    label: "Resting HR",
  });

  container.append(readinessItem, sleepItem, hrvItem, rhrItem);
}

function buildRingItem({ svg, number, unit, unitColor, delta, label, numberSize }) {
  // The delta lives OUTSIDE the ring (under the label) rather than crammed
  // inside the circle with the number + unit — three lines of text inside
  // an ~80px circle doesn't survive different browsers' font metrics
  // (Safari renders wider/taller than Chrome and it spills onto the ring
  // stroke). Only the number + unit live inside the ring itself.
  const item = document.createElement("div");
  item.className = "mini-ring-item";
  item.innerHTML = `
    <div class="mini-ring">
      ${svg}
      <div class="mini-ring-center">
        <span class="mini-ring-number"${numberSize ? ` style="font-size:${numberSize}"` : ""}>${number}</span>
        <span class="mini-ring-unit"${unitColor ? ` style="color:${unitColor}"` : ""}>${unit}</span>
      </div>
    </div>
    <div class="mini-ring-label">${label}</div>
    <div class="mini-ring-delta" style="color:${delta.color}">${delta.text}</div>
  `;
  return item;
}
