import { money } from './commerce';

// All date output uses the viewer's default locale, like the code it replaces.
const SALE_START = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
const TIME_ONLY = { hour: 'numeric', minute: '2-digit' };
const MESSAGE_TIME = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };

function toDate(value) {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function sameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Dollars (as stored on products/orders) → "$12.50". Non-numbers format as $0.00, like money(). */
export function formatPrice(value) {
  return money(value);
}

/**
 * Sale start as on SaleCard / FindYardSale results: "Sat, Nov 14, 9:00 AM".
 * SaleCard fell back to "Date to be announced", FindYardSale to "Time not specified".
 */
export function formatSaleStart(sale, fallback = 'Date to be announced') {
  const start = toDate(sale?.start_time);
  return start ? start.toLocaleString(undefined, SALE_START) : fallback;
}

/**
 * "Sat, Nov 14, 9:00 AM – 2:00 PM" (same day) or
 * "Sat, Nov 14, 9:00 AM – Sun, Nov 15, 1:00 PM". Missing end → start only.
 */
export function formatSaleRange(start, end, fallback = 'Date to be announced') {
  const from = toDate(start);
  if (!from) return fallback;
  const head = from.toLocaleString(undefined, SALE_START);
  const to = toDate(end);
  if (!to || to <= from) return head;
  const tail = sameLocalDay(from, to) ? to.toLocaleTimeString(undefined, TIME_ONLY) : to.toLocaleString(undefined, SALE_START);
  return `${head} – ${tail}`;
}

/**
 * General timestamp, replacing bare toLocaleString() ("11/14/2026, 9:00:00 AM")
 * with the sale format "Sat, Nov 14, 9:00 AM". Adds the year when it isn't the current one.
 */
export function formatDateTime(value, fallback = '', now = new Date()) {
  const date = toDate(value);
  if (!date) return fallback;
  const options = date.getFullYear() === toDate(now)?.getFullYear() ? SALE_START : { ...SALE_START, year: 'numeric' };
  return date.toLocaleString(undefined, options);
}

/** Messages list/thread timestamp: "Nov 14, 9:00 AM"; empty string when missing. */
export function formatMessageTime(value) {
  const date = toDate(value);
  return date ? date.toLocaleString([], MESSAGE_TIME) : '';
}

/** "3.2 miles away" (one decimal, always "miles"); empty string when unknown. */
export function formatDistance(miles) {
  if (miles == null || miles === '') return '';
  const value = Number(miles);
  return Number.isFinite(value) ? `${value.toFixed(1)} miles away` : '';
}
