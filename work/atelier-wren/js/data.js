/*
 * Atelier Wren: the business facts, in one place. These match the AI demo's facts
 * (assets/studio/aiassist.js) and Contract A section 10.6 exactly: change them only together.
 */
import { londonNow, londonToMs, nowMs, addDays, weekdayOf, timeText, penceText } from '../../../assets/shared/embed-api.js';

export const BUSINESS = 'Atelier Wren';
export const PHONE = '020 7946 0412';
export const PHONE_TEL = '+442079460412';
export const EMAIL = 'hello@atelierwren.example';

export const SERVICES = {
  cut_finish:  { key: 'cut_finish',  name: 'Cut and finish', pence: 5800, from: true,  min: 60 },
  full_colour: { key: 'full_colour', name: 'Full colour',    pence: 8500, from: true,  min: 120 },
  blow_dry:    { key: 'blow_dry',    name: 'Blow-dry',       pence: 3500, from: false, min: 45 },
};
export const SERVICE_KEYS = Object.keys(SERVICES);
export const priceText = (key) => (SERVICES[key].from ? 'from ' : '') + penceText(SERVICES[key].pence);

export const STYLISTS = { ana: 'Ana', theo: 'Theo', isla: 'Isla', sam: 'Sam' };
export const STYLIST_KEYS = Object.keys(STYLISTS);

// Opening hours, London time. Closed Sunday and Monday.
export const HOURS = {
  Tuesday: ['09:00', '18:00'],
  Wednesday: ['09:00', '18:00'],
  Thursday: ['09:00', '20:00'],
  Friday: ['09:00', '18:00'],
  Saturday: ['09:00', '17:00'],
};
export const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WINDOW_DAYS = 14;              // today to today + 13
export const LEAD_MS = 2 * 3600e3;          // today's slots start at least 2 hours from now
export const PATCH_MS = 48 * 3600e3;        // a first colour needs a patch test 48 hours before
export const HOLD_S = 600;                  // holds last 10 minutes
export const PATCH_NOTE = 'A patch test is needed at least 48 hours before your first colour with us.';
export const NOTICE_NOTE = 'Please give 24 hours’ notice to cancel or move an appointment.';

export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fromMin = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export const partOf = (time) => (time < '12:00' ? 'morning' : time < '17:00' ? 'afternoon' : 'evening');

export function hoursText(day) {
  const h = HOURS[day];
  return h ? `${timeText(h[0])} to ${timeText(h[1])}` : 'Closed';
}

/** "Open now until 6pm", "Opens at 9am today", "Closed today. Open Tuesday 9am to 6pm". */
export function openNow() {
  const now = londonNow();
  const h = HOURS[now.weekday];
  if (h && now.minutes >= toMin(h[0]) && now.minutes < toMin(h[1])) return { open: true, text: `Open now until ${timeText(h[1])}` };
  if (h && now.minutes < toMin(h[0])) return { open: false, text: `Opens at ${timeText(h[0])} today` };
  for (let i = 1; i <= 7; i++) {
    const d = addDays(now.date, i), wd = weekdayOf(d);
    if (HOURS[wd]) return { open: false, text: `Closed now. Open ${i === 1 ? 'tomorrow' : wd} ${hoursText(wd)}` };
  }
  return { open: false, text: 'Closed now' };
}

export { londonNow, londonToMs, nowMs };
