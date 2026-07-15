/* ==========================================================================
   birthdays.js — Birthday data provider + rendering
   ==========================================================================
   INTEGRATION POINT: replace `readBirthdaysCsv()` with a call to your real
   birthday source (contacts API, CRM export, etc). It must resolve to an
   array of { name, month, day, relation }. Everything downstream
   (today-list, 30-day timeline) works off that shape, so no other file
   needs to change.
   ========================================================================== */

const CSV_URL = "data/birthdays.csv";

async function readBirthdaysCsv() {
  const res = await fetch(`${CSV_URL}?t=${Date.now()}`, { cache: "no-store" });
  const text = await res.text();
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [name, month, day, relation] = line.split(",");
      return {
        name: name?.trim(),
        month: parseInt(month, 10),
        day: parseInt(day, 10),
        relation: relation?.trim() || "",
      };
    })
    .filter((b) => b.name && b.month && b.day);
}

function nextOccurrence(b, today) {
  const year = today.getFullYear();
  let d = new Date(year, b.month - 1, b.day);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (d < todayMidnight) {
    d = new Date(year + 1, b.month - 1, b.day);
  }
  return d;
}

function daysUntil(date, today) {
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((date - todayMidnight) / 86400000);
}

export async function getBirthdaysSummary(today = new Date()) {
  const raw = await readBirthdaysCsv();
  const withDates = raw
    .map((b) => ({ ...b, next: nextOccurrence(b, today) }))
    .map((b) => ({ ...b, daysUntil: daysUntil(b.next, today) }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const todayList = withDates.filter((b) => b.daysUntil === 0);
  const tomorrow = withDates.filter((b) => b.daysUntil === 1);
  const next3 = withDates.filter((b) => b.daysUntil >= 0 && b.daysUntil <= 3);
  const next30 = withDates.filter((b) => b.daysUntil >= 0 && b.daysUntil <= 30);

  return { all: withDates, today: todayList, tomorrow, next3, next30 };
}

export function renderBirthdayUpcomingRows(container, summary) {
  container.innerHTML = "";
  const upcoming = summary.next3;
  if (upcoming.length === 0) {
    container.innerHTML = `<div class="event-empty">Nothing in the next 3 days</div>`;
    return;
  }
  upcoming.forEach((b) => {
    const row = document.createElement("div");
    row.className = "birthday-row";
    const initials = b.name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const when = b.daysUntil === 0 ? "Today 🎂" : b.daysUntil === 1 ? "Tomorrow" : `In ${b.daysUntil}d`;
    row.innerHTML = `
      <div class="birthday-avatar">${initials}</div>
      <div class="birthday-name">${b.name}</div>
      <div class="birthday-when">${when}</div>
    `;
    container.appendChild(row);
  });
}

export function renderBirthdayTodayRows(container, summary) {
  container.innerHTML = "";
  if (summary.today.length === 0) {
    const empty = document.createElement("div");
    empty.className = "event-empty";
    empty.textContent = "No birthdays today";
    container.appendChild(empty);
    return;
  }
  summary.today.forEach((b) => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.innerHTML = `<span class="swatch" style="background:var(--accent-birthdays)"></span>${b.name} 🎂`;
    container.appendChild(row);
  });
}

export function renderBirthdayTimeline(container, summary) {
  container.innerHTML = "";
  if (summary.next30.length === 0) {
    container.innerHTML = `<div class="empty-state">No birthdays in the next 30 days</div>`;
    return;
  }
  summary.next30.forEach((b) => {
    const row = document.createElement("div");
    row.className = "birthday-timeline-row";
    const initials = b.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const when =
      b.daysUntil === 0 ? "Today" : b.daysUntil === 1 ? "Tomorrow" : `In ${b.daysUntil} days`;
    row.innerHTML = `
      <div class="birthday-avatar">${initials}</div>
      <div>
        <div class="birthday-name">${b.name}</div>
        <div class="agenda-sub">${b.relation || ""}</div>
      </div>
      <div class="birthday-date">${when}</div>
    `;
    container.appendChild(row);
  });
}
