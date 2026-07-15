/* ==========================================================================
   travel.js — Trips data provider + rendering
   ==========================================================================
   INTEGRATION POINT: replace `fetchTrips()` with a live call to your trip
   planner (e.g. Tripsy). Keep the returned shape: { id, name, startsAt,
   endsAt, segments[] } where each segment is one leg of the itinerary:
   { type: "flight"|"train"|"bus"|"roadtrip"|"hotel"|"activity", title,
   start, end, company, number, seatClass, seat, location, notes }.
   ========================================================================== */

const TYPE_ICON = {
  flight: "✈️",
  train: "🚆",
  bus: "🚌",
  roadtrip: "🚗",
  hotel: "🏨",
  activity: "🏕️",
};

async function fetchTrips() {
  const res = await fetch("data/trips.json");
  const json = await res.json();
  return json.trips;
}

function daysUntil(dateStr, today) {
  const target = new Date(dateStr + "T00:00:00");
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - todayMidnight) / 86400000);
}

function fmtShortDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString([], { month: "2-digit", day: "2-digit" });
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export async function getUpcomingTrips(today = new Date()) {
  const trips = await fetchTrips();
  return trips
    .filter((t) => daysUntil(t.endsAt, today) >= 0)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

function departsLabel(trip, today) {
  const departsIn = daysUntil(trip.startsAt, today);
  if (departsIn < 0) return "In progress";
  if (departsIn === 0) return "Departs today";
  if (departsIn === 1) return "Departs tomorrow";
  return `Departs in ${departsIn} days`;
}

export function renderTripsList(container, trips, today = new Date()) {
  container.innerHTML = "";
  if (!trips.length) {
    container.innerHTML = `<div class="empty-state">No upcoming trips</div>`;
    return;
  }
  trips.forEach((trip) => {
    const row = document.createElement("button");
    row.className = "trip-row";
    row.dataset.tripId = trip.id;
    row.innerHTML = `
      <span class="trip-row-icon">✈️</span>
      <div class="trip-row-main">
        <div class="trip-row-name">${trip.name}</div>
        <div class="trip-row-dates">${fmtShortDate(trip.startsAt)} – ${fmtShortDate(trip.endsAt)}</div>
      </div>
      <span class="trip-departs-pill">${departsLabel(trip, today)}</span>
    `;
    container.appendChild(row);
  });
}

export function renderItinerary(container, trip) {
  container.innerHTML = "";
  if (!trip) return;
  const sorted = [...trip.segments].sort((a, b) => new Date(a.start) - new Date(b.start));
  sorted.forEach((seg) => {
    const row = document.createElement("div");
    row.className = "itinerary-row";
    const detailParts = [];
    if (seg.company) detailParts.push(seg.company);
    if (seg.number) detailParts.push(seg.number);
    if (seg.seatClass || seg.seat) {
      detailParts.push(`${seg.seatClass || ""}${seg.seatClass && seg.seat ? " · " : ""}${seg.seat ? "Seat " + seg.seat : ""}`.trim());
    }

    const isStay = seg.type === "hotel" || seg.type === "activity";
    const dateLine = isStay
      ? `${fmtDateTime(seg.start)} – ${fmtDateTime(seg.end)}`
      : `${fmtDateTime(seg.start)} → ${fmtDateTime(seg.end)}`;

    row.innerHTML = `
      <div class="itinerary-icon">${TYPE_ICON[seg.type] || "📍"}</div>
      <div class="itinerary-body">
        <div class="itinerary-title">${seg.title}</div>
        <div class="itinerary-date">${dateLine}</div>
        ${detailParts.length ? `<div class="itinerary-detail">${detailParts.join(" · ")}</div>` : ""}
        ${seg.location ? `<div class="itinerary-detail">${seg.location}</div>` : ""}
        ${seg.notes ? `<div class="itinerary-detail">${seg.notes}</div>` : ""}
      </div>
    `;
    container.appendChild(row);
  });
}
