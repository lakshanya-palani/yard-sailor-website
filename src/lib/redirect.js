// Only same-origin, absolute application paths; reject protocol-relative and backslash URLs.
export function safeRedirect(value, fallback = '/') {
  return typeof value === 'string' && /^\/(?!\/)/.test(value) && !/[\\\u0000-\u0020]/.test(value) ? value : fallback;
}
