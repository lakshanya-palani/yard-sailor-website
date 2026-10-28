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
