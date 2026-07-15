/* ==========================================================================
   app.js — Dashboard v2 bootstrap
   ========================================================================== */

import * as CalendarMod from "./calendar.js";
import * as OuraMod from "./oura.js";
import * as WeatherMod from "./weather.js";
import * as MarketsMod from "./markets.js";
import * as TravelMod from "./travel.js";
import * as BirthdaysMod from "./birthdays.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------------------------------------------------------------------- *
 * Theme
 * ---------------------------------------------------------------------- */

const THEME_KEY = "dashboard-v2-theme"; // "dark" | "light" | "auto"

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "auto";
}

function systemPrefersLight() {
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

function applyTheme() {
  const pref = getStoredTheme();
  const resolved = pref === "auto" ? (systemPrefersLight() ? "light" : "dark") : pref;
  document.documentElement.setAttribute("data-theme", resolved);
  const toggle = $("#darkModeToggle");
  if (toggle) toggle.checked = resolved === "dark";
  const themeColorMeta = $('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", resolved === "dark" ? "#111315" : "#F2F1F6");
  }
}

function initTheme() {
  applyTheme();
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    if (getStoredTheme() === "auto") applyTheme();
  });
  const toggle = $("#darkModeToggle");
  toggle?.addEventListener("change", () => {
    localStorage.setItem(THEME_KEY, toggle.checked ? "dark" : "light");
    applyTheme();
  });
}

/* ---------------------------------------------------------------------- *
 * Sidebar (mobile)
 * ---------------------------------------------------------------------- */

function initSidebar() {
  const sidebar = $("#sidebar");
  const scrim = $("#sidebarScrim");
  const openBtn = $("#hamburgerBtn");
  const closeBtn = $("#sidebarCloseBtn");

  const open = () => {
    sidebar.classList.add("is-open");
    scrim.classList.add("is-open");
  };
  const close = () => {
    sidebar.classList.remove("is-open");
    scrim.classList.remove("is-open");
  };

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  scrim?.addEventListener("click", close);
  $$(".nav-link").forEach((link) => link.addEventListener("click", close));
}

/* ---------------------------------------------------------------------- *
 * Greeting + clock
 * ---------------------------------------------------------------------- */

function greetingForHour(hour) {
  if (hour < 5) return "Good Night";
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}

function renderGreeting() {
  const now = new Date();
  const hour = now.getHours();
  $("#greetingEyebrow").textContent = greetingForHour(hour);
  $("#greetingGlyph").textContent = hour >= 6 && hour < 20 ? "☀️" : "🌙";
  $("#greetingDate").textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function renderFooterClock() {
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzAbbr = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName")?.value || tz;
  $("#footerUpdated").textContent = `${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ${tzAbbr}`;
}

/* ---------------------------------------------------------------------- *
 * Counter animation
 * ---------------------------------------------------------------------- */

function animateCount(el, target, opts = {}) {
  const { duration = 700, decimals = 0 } = opts;
  const start = 0;
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = start + (target - start) * eased;
    el.textContent = value.toFixed(decimals);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------------- *
 * Sheet (expansion flyout)
 * ---------------------------------------------------------------------- */

function initSheet() {
  const scrim = $("#sheetScrim");
  const sheet = $("#sheet");
  const closeBtn = $("#sheetCloseBtn");

  function close() {
    sheet.classList.remove("is-open");
    scrim.classList.remove("is-open");
  }
  scrim.addEventListener("click", close);
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  return {
    open(title, renderFn) {
      $("#sheetTitle").textContent = title;
      const body = $("#sheetBody");
      body.innerHTML = "";
      renderFn(body);
      sheet.classList.add("is-open");
      scrim.classList.add("is-open");
    },
    close,
  };
}

/* ---------------------------------------------------------------------- *
 * Quick summary tiles
 * ---------------------------------------------------------------------- */

const QUICK_ICONS = {
  calendar: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>`,
  reminders: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="20" cy="18" r="0" /></svg>`,
  cake: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6M4 21h16M8 13V9M16 13V9M12 13V9M8 5s1-1 1-2-1-2-1-2M12 5s1-1 1-2-1-2-1-2M16 5s1-1 1-2-1-2-1-2"/></svg>`,
  plane: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 19.5l19-7.5-19-7.5 2 6.5 8 1-8 1z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
};

function renderQuickSummary({ calendarSummary, ouraSummary, weather, trip, marketsSummary, birthdaysSummary }) {
  const camarillo = weather.find((w) => w.id === "camarillo") || weather[0];

  const tripDeparts = trip ? Math.max(0, Math.round((new Date(trip.startsAt + "T00:00:00") - new Date()) / 86400000)) : null;

  const tiles = [
    { icon: QUICK_ICONS.calendar, accent: "accent-calendar", number: calendarSummary.events.length, label: calendarSummary.events.length === 1 ? "event today" : "events today", target: "today" },
    { icon: QUICK_ICONS.reminders, accent: "accent-calendar", number: calendarSummary.reminders.length, label: "due today", target: "today" },
    { icon: QUICK_ICONS.cake, accent: "accent-birthdays", number: birthdaysSummary.next30.length, label: "upcoming (30 days)", target: "today" },
    { icon: QUICK_ICONS.plane, accent: "accent-travel", number: trip ? tripDeparts : "–", label: trip ? "days" : "no trips", target: "trips" },
    { icon: QUICK_ICONS.sun, accent: "accent-weather", number: `${camarillo.current}°F`, label: `${camarillo.condition} · ${camarillo.name}`, target: "weather" },
    { icon: QUICK_ICONS.heart, accent: "accent-health", number: ouraSummary.readiness, label: OuraMod.readinessLabel(ouraSummary.readiness), target: "oura", isStatus: true, statusColor: ouraSummary.readiness >= 70 ? "var(--accent-markets)" : ouraSummary.readiness >= 50 ? "var(--accent-weather)" : "var(--accent-health)" },
  ];

  const grid = $("#quickSummary");
  grid.innerHTML = "";
  tiles.forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "quick-tile";
    btn.dataset.scrollTo = t.target;
    btn.innerHTML = `
      <span class="quick-tile-icon ${t.accent}">${t.icon}</span>
      <span class="quick-tile-number" style="${t.isStatus ? `color:${t.statusColor}` : ""}">${t.number}</span>
      <span class="quick-tile-text">${t.label}</span>
    `;
    grid.appendChild(btn);
  });

  $$(".quick-tile", grid).forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetCard = document.querySelector(`[data-card="${btn.dataset.scrollTo}"]`);
      targetCard?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

/* ---------------------------------------------------------------------- *
 * Boot
 * ---------------------------------------------------------------------- */

async function boot() {
  initTheme();
  initSidebar();
  renderGreeting();
  renderFooterClock();
  setInterval(renderFooterClock, 30000);
  const sheetApi = initSheet();

  const refreshBtn = $("#refreshBtn");
  refreshBtn?.addEventListener("click", () => loadAll(sheetApi, true));

  await loadAll(sheetApi, false);
}

async function loadAll(sheetApi, isManualRefresh) {
  const refreshBtn = $("#refreshBtn");
  refreshBtn?.classList.add("is-spinning");

  const today = new Date();

  const [calendarSummary, ouraSummary, weather, marketsSummary, trip, birthdaysSummary] = await Promise.all([
    CalendarMod.getTodayCalendarSummary(today),
    OuraMod.getOuraSummary(),
    WeatherMod.getWeatherSummary(),
    MarketsMod.getMarketsSummary(),
    TravelMod.getUpcomingTrip(today),
    BirthdaysMod.getBirthdaysSummary(today),
  ]);

  // Today card
  CalendarMod.renderNextEvent($("#nextEventRow"), calendarSummary, today);
  CalendarMod.renderReminders($("#remindersList"), calendarSummary);
  BirthdaysMod.renderBirthdayUpcomingRows($("#birthdaysTodayList"), birthdaysSummary);

  // Oura card
  OuraMod.renderReadinessRing($("#readinessRing"), $("#readinessNumber"), $("#readinessCaption"), ouraSummary);
  OuraMod.renderMetricGrid($("#ouraMetricGrid"), ouraSummary);

  // Weather card
  WeatherMod.renderWeatherColumns($("#weatherColumns"), weather);
  $$(".weather-row", $("#weatherColumns")).forEach((row) => {
    row.addEventListener("click", () => {
      const loc = weather.find((w) => w.id === row.dataset.locationId);
      sheetApi.open(`${loc.flag} ${loc.name} — 7 Day Forecast`, (body) => WeatherMod.renderForecast(body, loc));
    });
  });
  $("#weatherRefreshBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    loadAll(sheetApi, true);
  });

  // Markets card
  MarketsMod.renderIndices($("#marketsIndices"), marketsSummary);
  MarketsMod.renderPortfolio($("#portfolioGrid"), marketsSummary);
  const marketPill = $("#marketOpenPill");
  if (marketPill) {
    const open = MarketsMod.isMarketOpen(today);
    marketPill.textContent = open ? "Market Open" : "Market Closed";
    marketPill.style.color = open ? "var(--accent-markets)" : "var(--color-text-tertiary)";
    marketPill.style.background = open ? "rgba(52, 199, 89, 0.14)" : "var(--color-surface-2)";
  }

  // Trips card
  TravelMod.renderTripSummary($("#tripSummary"), trip, today);
  TravelMod.renderSegments($("#tripSegments"), trip, today);
  TravelMod.renderSegmentDots($("#tripDots"), trip);
  TravelMod.wireSegmentScroll($("#tripSegments"), $("#tripDots"));

  renderQuickSummary({ calendarSummary, ouraSummary, weather, trip, marketsSummary, birthdaysSummary });

  // Card tap-through targets (header tap opens the relevant expansion sheet)
  $('[data-card="today"] .card-header')?.addEventListener("click", () => {
    sheetApi.open("Today's Agenda", (body) => CalendarMod.renderAgenda(body, calendarSummary));
  });
  $("#birthdaysExpandBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    sheetApi.open("Birthdays — Next 30 Days", (body) => BirthdaysMod.renderBirthdayTimeline(body, birthdaysSummary));
  });
  $('[data-card-link="oura"]')?.addEventListener("click", (e) => {
    e.stopPropagation();
    sheetApi.open("Readiness — Last 8 Days", (body) => {
      body.innerHTML = ouraSummary.days
        .map(
          (d) => `
        <div class="agenda-row">
          <div class="agenda-time">${new Date(d.date + "T00:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</div>
          <div>
            <div class="agenda-title">Sleep ${Math.floor(d.totalSleepMinutes / 60)}h ${d.totalSleepMinutes % 60}m · Eff ${Math.round(d.sleepEfficiency)}%</div>
            <div class="agenda-sub">HRV ${Math.round(d.hrv)}ms · Resting HR ${Math.round(d.restingHR)}bpm</div>
          </div>
        </div>`
        )
        .join("");
    });
  });
  $('[data-card-link="weather"]')?.addEventListener("click", (e) => {
    e.stopPropagation();
    const loc = weather[0];
    sheetApi.open(`${loc.flag} ${loc.name} — 7 Day Forecast`, (body) => WeatherMod.renderForecast(body, loc));
  });
  $('[data-card-link="markets"]')?.addEventListener("click", (e) => {
    e.stopPropagation();
    sheetApi.open("Portfolio", (body) => {
      body.className = "sheet-body";
      MarketsMod.renderPortfolio(body, marketsSummary);
    });
  });
  $('[data-card="markets"]')?.addEventListener("click", (e) => {
    if (e.target.closest("[data-card-link]")) return;
    sheetApi.open("Portfolio", (body) => {
      body.className = "sheet-body";
      MarketsMod.renderPortfolio(body, marketsSummary);
    });
  });
  const tripsHandler = (e) => {
    if (!trip) return;
    if (e.target.closest(".segment-card")) return;
    e.stopPropagation();
    sheetApi.open(`${trip.countryFlag} ${trip.destination} — Trip Details`, (body) => {
      body.className = "sheet-body";
      body.style.flexDirection = "column";
      TravelMod.renderSegments(body, trip, today);
    });
  };
  $('[data-card-link="trips"]')?.addEventListener("click", tripsHandler);
  $('[data-card="trips"]')?.addEventListener("click", tripsHandler);

  refreshBtn?.classList.remove("is-spinning");
  renderFooterClock();
}

document.addEventListener("DOMContentLoaded", boot);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((err) => {
      console.warn("Service worker registration failed", err);
    });
  });
}
