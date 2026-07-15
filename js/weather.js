/* ==========================================================================
   weather.js — Weather data provider (live) + rendering
   ==========================================================================
   Uses Open-Meteo (no API key required, CORS-friendly) so the dashboard is
   immediately runnable with real forecasts.
   INTEGRATION POINT: to switch providers, replace `fetchLocation()` — keep
   the returned shape { current, high, low, condition, code, daily[] }.
   ========================================================================== */

const LOCATIONS = [
  { id: "camarillo", flag: "🇺🇸", name: "Camarillo", lat: 34.216, lon: -119.038, tz: "America/Los_Angeles", unit: "fahrenheit" },
  { id: "york", flag: "🇬🇧", name: "York", lat: 53.958, lon: -1.08, tz: "Europe/London", unit: "fahrenheit" },
  { id: "pepieux", flag: "🇫🇷", name: "Pépieux", lat: 43.279, lon: 2.734, tz: "Europe/Paris", unit: "fahrenheit" },
];

const WMO_MAP = {
  0: { label: "Clear", icon: "☀️" },
  1: { label: "Mostly clear", icon: "🌤" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Fog", icon: "🌫" },
  48: { label: "Fog", icon: "🌫" },
  51: { label: "Drizzle", icon: "🌦" },
  53: { label: "Drizzle", icon: "🌦" },
  55: { label: "Drizzle", icon: "🌦" },
  61: { label: "Rain", icon: "🌧" },
  63: { label: "Rain", icon: "🌧" },
  65: { label: "Heavy rain", icon: "🌧" },
  71: { label: "Snow", icon: "🌨" },
  73: { label: "Snow", icon: "🌨" },
  75: { label: "Heavy snow", icon: "❄️" },
  80: { label: "Showers", icon: "🌦" },
  81: { label: "Showers", icon: "🌦" },
  82: { label: "Heavy showers", icon: "🌦" },
  95: { label: "Thunderstorms", icon: "⛈" },
  96: { label: "Thunderstorms", icon: "⛈" },
  99: { label: "Thunderstorms", icon: "⛈" },
};

function describe(code) {
  return WMO_MAP[code] || { label: "—", icon: "🌡" };
}

async function fetchLocation(loc) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=${loc.unit}&timezone=${encodeURIComponent(loc.tz)}&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather fetch failed for ${loc.name}`);
  const json = await res.json();
  const todayDesc = describe(json.daily.weather_code[0]);
  return {
    id: loc.id,
    flag: loc.flag,
    name: loc.name,
    current: Math.round(json.current.temperature_2m),
    high: Math.round(json.daily.temperature_2m_max[0]),
    low: Math.round(json.daily.temperature_2m_min[0]),
    condition: todayDesc.label,
    icon: todayDesc.icon,
    daily: json.daily.time.map((date, i) => {
      const d = describe(json.daily.weather_code[i]);
      return {
        date,
        high: Math.round(json.daily.temperature_2m_max[i]),
        low: Math.round(json.daily.temperature_2m_min[i]),
        icon: d.icon,
        label: d.label,
      };
    }),
  };
}

let cache = null;

export async function getWeatherSummary() {
  if (cache) return cache;
  try {
    const results = await Promise.all(LOCATIONS.map(fetchLocation));
    cache = results;
    return results;
  } catch (err) {
    console.warn("Live weather unavailable, using fallback values.", err);
    return LOCATIONS.map((loc) => ({
      id: loc.id,
      flag: loc.flag,
      name: loc.name,
      current: "--",
      high: "--",
      low: "--",
      condition: "Unavailable",
      icon: "🌡",
      daily: [],
    }));
  }
}

export function renderWeatherColumns(container, locations) {
  container.innerHTML = "";
  locations.forEach((loc) => {
    const col = document.createElement("button");
    const toC = (f) => (typeof f === "number" ? Math.round(((f - 32) * 5) / 9) : "--");
    col.className = "weather-row";
    col.dataset.locationId = loc.id;
    col.innerHTML = `
      <div class="weather-row-place">
        <div class="weather-row-name">${loc.flag} ${loc.name}</div>
        <div class="weather-row-cond">${loc.condition}</div>
      </div>
      <span class="weather-row-icon">${loc.icon}</span>
      <div class="weather-row-temp">
        <div class="weather-row-current">${loc.current}°F <span class="c-temp">${toC(loc.current)}°C</span></div>
      </div>
      <div class="weather-row-range">H ${loc.high}° / ${toC(loc.high)}°<br>L ${loc.low}° / ${toC(loc.low)}°</div>
    `;
    container.appendChild(col);
  });
}

export function renderHeroWeather(container, loc) {
  const toC = (f) => (typeof f === "number" ? Math.round(((f - 32) * 5) / 9) : "--");
  container.innerHTML = `
    <span class="hero-weather-icon">${loc.icon}</span>
    <div class="hero-weather-main">
      <div class="hero-weather-temp">${loc.current}°F</div>
      <div class="hero-weather-sub">${loc.condition} · ${loc.name}</div>
    </div>
    <div class="hero-weather-range">
      <div>H ${loc.high}° · L ${loc.low}°</div>
      <div>${toC(loc.high)}°C / ${toC(loc.low)}°C</div>
    </div>
  `;
}

export function renderForecast(container, loc) {
  container.innerHTML = "";
  if (!loc.daily.length) {
    container.innerHTML = `<div class="empty-state">Forecast unavailable</div>`;
    return;
  }
  loc.daily.forEach((d, i) => {
    const dayLabel = i === 0 ? "Today" : new Date(d.date).toLocaleDateString([], { weekday: "short" });
    const row = document.createElement("div");
    row.className = "forecast-day-row";
    row.innerHTML = `
      <span class="forecast-day-name">${dayLabel}</span>
      <span class="forecast-icon">${d.icon}</span>
      <span class="forecast-range"><span class="hi">${d.high}°</span><span class="lo">${d.low}°</span></span>
    `;
    container.appendChild(row);
  });
}
