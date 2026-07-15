/* ==========================================================================
   calendar.js — Calendar + Reminders data provider and rendering
   ==========================================================================
   Data source: Fantastical, scoped to the "Me" calendar set (iCloud Personal
   + CRSI Calendar) for events, and Apple Reminders items due today for
   reminders. INTEGRATION POINT: swap `fetchEvents()` / `fetchReminders()` to
   call a live Fantastical bridge over a small backend endpoint instead of
   the local JSON snapshots (a static GitHub Pages site can't call the
   Fantastical MCP directly). Keep the returned shape the same: events ->
   { id, title, start, end, calendar, location, attendees, isOnline },
   reminders -> { id, title, list, priority, completed, dueTime }.
   ========================================================================== */

async function fetchEvents() {
  const res = await fetch(`data/calendar.json?t=${Date.now()}`, { cache: "no-store" });
  const json = await res.json();
  return json.events;
}

async function fetchReminders() {
  const res = await fetch(`data/reminders.json?t=${Date.now()}`, { cache: "no-store" });
  const json = await res.json();
  return json.reminders.filter((r) => !r.completed);
}

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function isToday(iso, today) {
  const d = new Date(iso);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export async function getTodayCalendarSummary(today = new Date()) {
  const [events, reminders] = await Promise.all([fetchEvents(), fetchReminders()]);
  const todaysEvents = events
    .filter((e) => isToday(e.start, today))
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  const nextEvent = todaysEvents.find((e) => new Date(e.end) > today) || todaysEvents[0] || null;
  return { events: todaysEvents, nextEvent, reminders };
}

function countdownLabel(startIso, now) {
  const diffMs = new Date(startIso) - now;
  if (diffMs <= 0) return "In progress";
  const totalMin = Math.round(diffMs / 60000);
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hrs === 0) return `in ${min} min`;
  if (min === 0) return `in ${hrs} hr`;
  return `in ${hrs} hr ${min} min`;
}

export function renderNextEvent(container, summary, now = new Date()) {
  container.innerHTML = "";
  if (!summary.nextEvent) {
    container.innerHTML = `<div class="event-empty">No events scheduled</div>`;
    return;
  }
  const e = summary.nextEvent;
  const row = document.createElement("div");
  row.innerHTML = `
    <div class="row-label-line">
      <span class="next-appt-title">${e.title}</span>
      <span class="next-appt-time">${fmtTime(e.start)}</span>
    </div>
    <div class="next-appt-countdown">${countdownLabel(e.start, now)}</div>
  `;
  container.appendChild(row);
}

export function renderReminders(container, summary) {
  container.innerHTML = "";
  const label = document.getElementById("remindersLabel");
  if (label) label.textContent = `Reminders (${summary.reminders.length})`;
  if (summary.reminders.length === 0) {
    container.innerHTML = `<div class="event-empty">Nothing on your list today</div>`;
    return;
  }
  summary.reminders.slice(0, 4).forEach((r) => {
    const row = document.createElement("div");
    row.className = "reminder-row";
    row.innerHTML = `
      <span class="reminder-check"></span>
      <span class="reminder-title">${r.title}</span>
      ${r.dueTime ? `<span class="reminder-time">${fmtTime(r.dueTime)}</span>` : ""}
    `;
    container.appendChild(row);
  });
}

export function renderAgenda(container, summary) {
  container.innerHTML = "";
  if (summary.events.length === 0) {
    container.innerHTML = `<div class="empty-state">Nothing on your calendar today</div>`;
    return;
  }
  summary.events.forEach((e) => {
    const row = document.createElement("div");
    row.className = "agenda-row";
    row.innerHTML = `
      <div class="agenda-time">${fmtTime(e.start)}</div>
      <div>
        <div class="agenda-title">${e.title}</div>
        ${e.attendees?.length ? `<div class="agenda-sub">${e.attendees.join(", ")}</div>` : ""}
      </div>
    `;
    container.appendChild(row);
  });
}

export function eventCountLabel(summary) {
  const n = summary.events.length;
  if (n === 0) return "No events today";
  if (n === 1) return "1 event today";
  return `${n} events today`;
}
