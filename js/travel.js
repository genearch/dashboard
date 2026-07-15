/* ==========================================================================
   travel.js — Trips data provider + rendering
   ==========================================================================
   INTEGRATION POINT: replace `fetchTrips()` with a live call to your trip
   planner (e.g. Tripsy). Keep the returned shape: { id, name, destination,
   countryFlag, startsAt, endsAt, segments[] } where each segment is either
   a flight (type:"flight") or a stay (type:"hotel").
   ========================================================================== */

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

export async function getUpcomingTrip(today = new Date()) {
  const trips = await fetchTrips();
  const upcoming = trips
    .filter((t) => daysUntil(t.endsAt, today) >= 0)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  return upcoming[0] || null;
}

export function renderTripSummary(el, trip, today = new Date()) {
  if (!trip) {
    el.innerHTML = `<div class="empty-state">No upcoming trips</div>`;
    return;
  }
  const departsIn = daysUntil(trip.startsAt, today);
  const departsLabel =
    departsIn < 0 ? "In progress" : departsIn === 0 ? "Departs today" : `Departs in ${departsIn} day${departsIn === 1 ? "" : "s"}`;

  el.innerHTML = `
    <div class="trip-destinations">${trip.countryFlag} ${trip.destination}</div>
    <div class="trip-meta">
      <span>${fmtShortDate(trip.startsAt)}–${fmtShortDate(trip.endsAt)}</span>
      <span class="trip-departs-pill">${departsLabel}</span>
    </div>
  `;
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function segmentPill(dateIso, today) {
  const diff = daysUntil(dateIso.slice(0, 10), today);
  if (diff < 0) return "Past";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

export function renderSegments(container, trip, today = new Date()) {
  container.innerHTML = "";
  if (!trip) return;
  trip.segments.forEach((seg) => {
    const card = document.createElement("div");
    card.className = "segment-card";
    if (seg.type === "flight") {
      card.innerHTML = `
        <span class="segment-pill">${segmentPill(seg.departure, today)}</span>
        <div class="segment-route">✈️ ${seg.route}</div>
        <div class="segment-time">${fmtDateTime(seg.departure)}</div>
        <div class="segment-detail">${seg.company}${seg.flightNumber ? " · " + seg.flightNumber : ""}</div>
        ${seg.seat ? `<div class="segment-detail">${seg.seatClass || ""} · Seat ${seg.seat}</div>` : ""}
      `;
    } else {
      card.innerHTML = `
        <span class="segment-pill">${segmentPill(seg.checkIn + "T00:00:00Z", today)}</span>
        <div class="segment-route">🏨 ${seg.name}</div>
        <div class="segment-time">${fmtShortDate(seg.checkIn)} – ${fmtShortDate(seg.checkOut)}</div>
        <div class="segment-detail">${seg.room || ""}</div>
      `;
    }
    container.appendChild(card);
  });
}

export function renderSegmentDots(container, trip) {
  container.innerHTML = "";
  if (!trip) return;
  trip.segments.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "dot-item" + (i === 0 ? " is-active" : "");
    container.appendChild(dot);
  });
}

export function wireSegmentScroll(scrollEl, dotsContainer) {
  if (!scrollEl || !dotsContainer) return;
  const dots = Array.from(dotsContainer.children);
  if (dots.length <= 1) return;
  scrollEl.addEventListener("scroll", () => {
    const cardWidth = scrollEl.firstElementChild?.getBoundingClientRect().width || 1;
    const gap = 14;
    const index = Math.round(scrollEl.scrollLeft / (cardWidth + gap));
    dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
  });
}
