const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let admin = true; // Set to true for demonstration

function $(id) { return document.getElementById(id); }

function renderCalendar(month, year) {
  $('month-year').textContent = `${year} - ${month+1}`;
  // Weekday row
  const weekdayRow = $('weekday-row');
  weekdayRow.innerHTML = '';
  for (let wd of WEEKDAYS) {
    const th = document.createElement('th');
    th.textContent = wd;
    weekdayRow.appendChild(th);
  }
  // Days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const calendarBody = $('calendar-body');
  calendarBody.innerHTML = '';
  let date = 1;
  for (let i = 0; i < 6; i++) {
    let row = document.createElement('tr');
    for (let j = 0; j < 7; j++) {
      let cell = document.createElement('td');
      cell.className = 'day';
      if (i === 0 && j < firstDay) {
        cell.innerHTML = '';
      } else if (date > daysInMonth) {
        cell.innerHTML = '';
      } else {
        cell.textContent = date;
        cell.dataset.day = date;
        cell.addEventListener('click', () => showDayDetail(date, month, year));
        // List events
        let events = getEventsForDay(year, month, date);
        if (events.length > 0) {
          let eventsList = document.createElement('div');
          eventsList.className = 'events-list';
          for (let ev of events) {
            let label = document.createElement('span');
            label.className = 'event-label';
            label.textContent = ev.name;
            label.style.background = ev.color;
            eventsList.appendChild(label);
          }
          cell.appendChild(eventsList);
        }
        date++;
      }
      row.appendChild(cell);
    }
    calendarBody.appendChild(row);
    if (date > daysInMonth) break;
  }
}

function showDayDetail(day, month, year) {
  const aside = $('day-detail');
  aside.classList.remove('hidden');
  aside.innerHTML = `<h2>${year}-${month+1}-${day}</h2>`;
  // Timeline
  const timeline = document.createElement('div');
  timeline.id = 'day-events-timeline';
  aside.appendChild(timeline);
  // Events
  let events = getEventsForDay(year, month, day);
  for (let ev of events) {
    let block = document.createElement('div');
    block.className = 'timeline-block';
    block.textContent = ev.name;
    block.style.background = ev.color;
    // Calculate position based on start/end time
    let startHour = new Date(ev.start).getHours();
    let endHour = new Date(ev.end).getHours();
    let top = (startHour / 24) * 100;
    let height = ((endHour - startHour) / 24) * 100;
    block.style.top = `${top}%`;
    block.style.height = `${height}%`;
    timeline.appendChild(block);
  }
  // List events
  let eventsList = document.createElement('ul');
  for (let ev of events) {
    let li = document.createElement('li');
    li.innerHTML = `<span style="background:${ev.color};color:#fff;padding:2px 4px;border-radius:2px;">${ev.name}</span> 
      (${formatTime(ev.start)} - ${formatTime(ev.end)})<br>${ev.description}`;
    eventsList.appendChild(li);
  }
  aside.appendChild(eventsList);
  // Add event form if admin
  if (admin) {
    let form = document.createElement('form');
    form.id = 'add-event-form';
    form.innerHTML = `
      <h3>Add event</h3>
      <input type="text" name="name" placeholder="Event name" required>
      <textarea name="description" placeholder="Description"></textarea>
      <label>Start: <input type="datetime-local" name="start" required></label>
      <label>End: <input type="datetime-local" name="end" required></label>
      <label>Colour: <input type="color" name="color" value="#5c6bc0"></label>
      <button type="submit">Add Event</button>
    `;
    form.onsubmit = function(e) {
      e.preventDefault();
      addEvent(year, month, day, {
        name: form.name.value,
        description: form.description.value,
        start: form.start.value,
        end: form.end.value,
        color: form.color.value
      });
      showDayDetail(day, month, year);
      renderCalendar(currentMonth, currentYear);
    };
    aside.appendChild(form);
  }
}

function formatTime(dtStr) {
  let dt = new Date(dtStr);
  let h = dt.getHours().toString().padStart(2,'0');
  let m = dt.getMinutes().toString().padStart(2,'0');
  return `${h}:${m}`;
}

// Local storage event handling
function getEventsForDay(year, month, day) {
  let events = JSON.parse(localStorage.getItem('calendar-events') || '[]');
  return events.filter(ev => {
    let evDate = new Date(ev.start);
    return evDate.getFullYear() === year && evDate.getMonth() === month && evDate.getDate() === day;
  });
}
function addEvent(year, month, day, event) {
  let events = JSON.parse(localStorage.getItem('calendar-events') || '[]');
  events.push(event);
  localStorage.setItem('calendar-events', JSON.stringify(events));
}

// Navigation
$('prev-month').onclick = function() {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar(currentMonth, currentYear);
  $('day-detail').classList.add('hidden');
};
$('next-month').onclick = function() {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar(currentMonth, currentYear);
  $('day-detail').classList.add('hidden');
};

// Initialize
renderCalendar(currentMonth, currentYear);