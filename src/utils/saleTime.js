// Timestamps are absolute instants. Older records without an end time expire
// 24 hours after their start because their original time zone is not stored.
export function getSaleStatus(sale, now = Date.now()) {
  if (["cancelled", "completed", "draft"].includes(sale.status)) return sale.status;
  const start = sale.start_time ? Date.parse(sale.start_time) : NaN;
  const end = sale.end_time ? Date.parse(sale.end_time) : (Number.isFinite(start) ? start + 24 * 60 * 60 * 1000 : NaN);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "unknown";
  if (now >= end) return "ended";
  return now < start ? "upcoming" : "live";
}

export function saleStatusLabel(sale, now) {
  const status = getSaleStatus(sale, now);
  return ({ upcoming: "Upcoming", live: "Happening now", ended: "Ended", cancelled: "Cancelled", completed: "Ended", draft: "Draft", unknown: "Time unavailable" })[status] || "Time unavailable";
}

// Filter windows use the viewer's local calendar and half-open intervals.
export function saleOverlapsLocalWindow(sale, window, now = Date.now()) {
  const start = sale.start_time ? Date.parse(sale.start_time) : NaN;
  const end = sale.end_time ? Date.parse(sale.end_time) : (Number.isFinite(start) ? start + 24 * 60 * 60 * 1000 : NaN);
  const windowStart = new Date(now);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !Number.isFinite(windowStart.getTime())) return false;
  windowStart.setHours(0, 0, 0, 0);
  if (window === "weekend") {
    const day = windowStart.getDay();
    windowStart.setDate(windowStart.getDate() + (day === 0 ? -1 : 6 - day));
  } else if (window !== "today") {
    return false;
  }
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + (window === "weekend" ? 2 : 1));
  return start < windowEnd.getTime() && end > windowStart.getTime();
}
