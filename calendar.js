const CALENDAR_ID = 'da0fecd924660341cc4e2c350911b2384034747830292b954642fb4b00d64db3@group.calendar.google.com'; // <-- Replace with your calendar ID
const API_KEY = 'AIzaSyBi0ImWvJfToY50a3yf3FEcdzyO49y8hSU'; // <-- Replace with your API key

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let eventsCache = {}; // Cache events for months

document.addEventListener('DOMContentLoaded', () => {
  setupUI();
  loadCalendar(currentYear, currentMonth);
});

function setupUI() {
  // Calendar Header
  const header = document.getElementById('calendar-header');
  header.innerHTML = `
    <h2 id="month-year"></h2>
    <div class="weekday-row">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<span class="weekday-name">${d}</span>`).join('')}</div>
  `;

  // Navigation
  const nav = document.getElementById('calendar-navigation');
  nav.innerHTML = `
    <button id="prev-month">&lt; Prev</button>
    <button id="next-month">Next &gt;</button>
  `;
  document.getElementById('prev-month').onclick = () => {
    changeMonth(-1);
  };
  document.getElementById('next-month').onclick = () => {
    changeMonth(1);
  };
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  loadCalendar(currentYear, currentMonth);
}

function loadCalendar(year, month) {
  eventsCache = {}; // Clear all cached events
  document.getElementById('month-year').textContent = `${getMonthName(month)} ${year}`;
  fetchEvents(year, month).then(events => {
    renderCalendarGrid(year, month, events);
  });
}

function fetchEvents(year, month) {
  const cacheKey = `${year}-${month}`;
  if (eventsCache[cacheKey]) {
    return Promise.resolve(eventsCache[cacheKey]);
  }
  const timeMin = new Date(year, month, 1).toISOString();
  const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

  return fetch(url)
    .then(res => res.json())
    .then(data => {
      const events = (data.items || []).map(ev => ({
        id: ev.id,
        summary: ev.summary || '',
        start: ev.start.dateTime || ev.start.date,
        end: ev.end.dateTime || ev.end.date,
        colorId: ev.colorId || null,
        description: ev.description || '',
        location: ev.location || '',
      }));
      eventsCache[cacheKey] = events;
      return events;
    });
}

function renderCalendarGrid(year, month, events) {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = ''; // Clear previous

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Fill blank days at start
  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'day-square blank';
    grid.appendChild(blank);
  }

  // Fill days
  for (let date = 1; date <= daysInMonth; date++) {
    const daySquare = document.createElement('div');
    daySquare.className = 'day-square';
    daySquare.innerHTML = `<div class="day-number">${date}</div><div class="event-list"></div>`;
    daySquare.onclick = () => showDetailedView(year, month, date, events);

    const eventList = daySquare.querySelector('.event-list');
    // List events for this day
    const eventsForDay = events.filter(ev => eventOccursOn(ev, year, month, date));
    eventsForDay.forEach(ev => {
      const evElem = document.createElement('div');
      evElem.className = 'event-item';
      evElem.textContent = ev.summary;
      evElem.style.backgroundColor = getEventColor(ev.colorId);
      eventList.appendChild(evElem);
    });

    grid.appendChild(daySquare);
  }

  // Fill blank days at end
  const totalSquares = firstDay + daysInMonth;
  for (let i = 0; i < (7 - (totalSquares % 7)) % 7; i++) {
    const blank = document.createElement('div');
    blank.className = 'day-square blank';
    grid.appendChild(blank);
  }
}

function eventOccursOn(ev, year, month, day) {
  const evStart = new Date(ev.start);
  // For all-day events, ev.start may be a date string
  if (ev.start.length === 10) {
    // Format: YYYY-MM-DD
    return evStart.getFullYear() === year && evStart.getMonth() === month && evStart.getDate() === day;
  }
  // For timed events
  return evStart.getFullYear() === year && evStart.getMonth() === month && evStart.getDate() === day;
}

function showDetailedView(year, month, day, events) {
  const dv = document.getElementById('detailed-view');
  dv.style.display = 'block';
  dv.innerHTML = `<h3>${getMonthName(month)} ${day}, ${year}</h3><div class="detailed-events"></div><div class="day-zones"></div>`;

  const eventsForDay = events.filter(ev => eventOccursOn(ev, year, month, day));

  // List events
  const detailedEvents = dv.querySelector('.detailed-events');
  if (eventsForDay.length === 0) {
    detailedEvents.innerHTML = '<p>No events.</p>';
  } else {
    eventsForDay.forEach(ev => {
      const evElem = document.createElement('div');
      evElem.className = 'detailed-event';
      evElem.innerHTML = `<strong>${ev.summary}</strong>
        <br>${formatEventTime(ev)}
        ${ev.description ? `<br>${ev.description}` : ''}`;
      detailedEvents.appendChild(evElem);
    });
  }

  // Visualize colored zones for timed events (08:00 - 18:00 scale)
  const dayZones = dv.querySelector('.day-zones');
  dayZones.style.position = 'relative';
  dayZones.style.height = '300px';
  dayZones.style.border = '1px solid #ccc';
  dayZones.style.background = '#fff';
  dayZones.innerHTML = `<div style="position:absolute;left:0;top:0;width:100%;height:100%;z-index:0;">
    ${renderTimeScale()}
  </div>`;

  // Position blocks for each timed event
  eventsForDay.forEach(ev => {
    if (ev.start.length === 10) return; // skip all-day events
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    // Only visualize between 8:00 and 18:00
    const minHour = 8, maxHour = 18;
    if (endHour < minHour || startHour > maxHour) return;
    // Clamp to scale
    const blockStart = Math.max(startHour, minHour);
    const blockEnd = Math.min(endHour, maxHour);

    const blockTop = ((blockStart - minHour) / (maxHour - minHour)) * 100;
    const blockHeight = ((blockEnd - blockStart) / (maxHour - minHour)) * 100;

    const zone = document.createElement('div');
    zone.className = 'event-block';
    zone.style.position = 'absolute';
    zone.style.left = '5%';
    zone.style.width = '90%';
    zone.style.top = `${blockTop}%`;
    zone.style.height = `${blockHeight}%`;
    zone.style.background = getEventColor(ev.colorId);
    zone.style.opacity = '0.7';
    zone.style.borderRadius = '5px';
    zone.style.zIndex = 2;
    zone.innerHTML = `<span style="padding:4px;font-size:12px;">${ev.summary}</span>`;
    dayZones.appendChild(zone);
  });
}

// Draw time scale for 8:00 - 18:00
function renderTimeScale() {
  let scale = '';
  for (let h = 8; h <= 18; h++) {
    const percent = ((h - 8) / (18 - 8)) * 100;
    scale += `<div style="position:absolute;top:${percent}%;left:0;width:100%;height:1px;background:#eee;"></div>
      <div style="position:absolute;top:${percent}%;left:0;width:100%;font-size:11px;color:#999;">${h}:00</div>`;
  }
  return scale;
}

function formatEventTime(ev) {
  if (ev.start.length === 10) return 'All day';
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  return `${pad(start.getHours())}:${pad(start.getMinutes())} - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

function pad(n) { return n.toString().padStart(2, '0'); }

function getMonthName(m) {
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m];
}

// Basic color palette for event blocks (Google Calendar's colorId mapping can be expanded)
function getEventColor(colorId) {
  const palette = {
    '1': '#a4bdfc',
    '2': '#7ae7bf',
    '3': '#dbadff',
    '4': '#ff887c',
    '5': '#fbd75b',
    '6': '#ffb878',
    '7': '#46d6db',
    '8': '#e1e1e1',
    '9': '#5484ed',
    '10': '#51b749',
    'default': '#89CFF0'
  };
  return palette[colorId] || palette['default'];
}

// Optional: Hide detailed view when clicking outside
document.addEventListener('click', function(e) {
  const dv = document.getElementById('detailed-view');
  if (!dv.contains(e.target) && !e.target.classList.contains('day-square')) {
    dv.style.display = 'none';
  }
});