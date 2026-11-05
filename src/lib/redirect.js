// Only same-origin, absolute application paths; reject protocol-relative and backslash URLs.
export function safeRedirect(value, fallback = '/') {
  return typeof value === 'string' && /^\/(?!\/)/.test(value) && ![...value].some(char => char === '\\' || char.charCodeAt(0) <= 32) ? value : fallback;
}
