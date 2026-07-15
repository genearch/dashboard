/* ==========================================================================
   oura.js — Health data provider (readiness ring + metrics)
   ==========================================================================
   INTEGRATION POINT: replace `fetchDays()` with a live call to your health
   MCP / Oura Cloud API. Expected shape per day: { date, totalSleepMinutes,
   sleepEfficiency, deepSleepMinutes, remSleepMinutes, awakeMinutes, hrv,
   restingHR, bodyTemperature }. The readiness score below is computed
   client-side from real inputs, not hard-coded, so it keeps working once
   you swap the source.
   ========================================================================== */

async function fetchDays() {
  const res = await fetch("data/oura.json");
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

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
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

export function renderReadinessRing(svgEl, numberEl, captionEl, summary) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const pct = summary.readiness / 100;
  const valueCircle = svgEl.querySelector(".ring-value");
  valueCircle.setAttribute("stroke-dasharray", `${circumference * pct} ${circumference}`);
  numberEl.textContent = summary.readiness;
  captionEl.textContent = readinessLabel(summary.readiness);
  captionEl.style.color = readinessColor(summary.readiness);
}

const METRIC_ICONS = {
  sleep: "🛏️",
  hrv: "💓",
  restingHR: "❤️",
  bodyTemp: "🌡️",
};

export function renderMetricGrid(container, summary) {
  const { last } = summary;
  const sleepHrs = Math.floor(last.totalSleepMinutes / 60);
  const sleepMin = last.totalSleepMinutes % 60;
  const rows = [
    { key: "sleep", label: "Sleep", value: `${sleepHrs}h ${sleepMin}m` },
    { key: "hrv", label: "HRV", value: `${Math.round(last.hrv)} ms` },
    { key: "restingHR", label: "Resting HR", value: `${Math.round(last.restingHR)} bpm` },
    { key: "bodyTemp", label: "Body Temp", value: last.bodyTemperature != null ? `${last.bodyTemperature > 0 ? "+" : ""}${last.bodyTemperature.toFixed(1)}°F` : "—" },
  ];
  container.innerHTML = "";
  rows.forEach((r) => {
    const el = document.createElement("div");
    el.className = "metric-row";
    el.innerHTML = `
      <span class="metric-row-icon">${METRIC_ICONS[r.key]}</span>
      <span class="metric-row-label">${r.label}</span>
      <span class="metric-row-value">${r.value}</span>
    `;
    container.appendChild(el);
  });
}
