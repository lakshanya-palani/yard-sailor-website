import { useEffect, useRef, useState } from "react";

export const PRODUCT_CATEGORIES = [
  "furniture", "clothing", "electronics", "collectibles", "home & kitchen", "sports & outdoors", "books & media", "other",
];

export function validateProduct(form) {
  const title = (form.title || "").trim(), description = (form.description || "").trim();
  if (!title || title.length > 70) return "Enter a title of 1–70 characters.";
  if (!description || description.length > 500) return "Enter a description of 1–500 characters.";
  if ((form.brand || "").trim().length > 100) return "Brand must be 100 characters or fewer.";
  if (form.price === "" || form.price == null || !Number.isFinite(Number(form.price)) || Number(form.price) < 0) return "Enter a valid, non-negative price.";
  if (!form.condition) return "Select a condition.";
  if (!PRODUCT_CATEGORIES.includes(form.category)) return "Select a valid category.";
  if (!form.pickup && !form.shipping) return "Choose pickup, shipping, or both.";
  return "";
}

export function validateSale(form) {
  const title = (form.title || "").trim(), description = (form.description || "").trim(), address = (form.address || "").trim();
  if (!title || title.length > 80) return "Enter a title of 1–80 characters.";
  if (!description || description.length > 1000) return "Enter a description of 1–1000 characters.";
  if (!address || address.length > 500) return "Enter an address of 1–500 characters.";
  const start = new Date(form.startTime || form.start_time).getTime(), end = new Date(form.endTime || form.end_time).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "Enter a valid end time after the start time.";
  return "";
}

export function useUnsavedChanges(dirty) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

// Drafts contain only the explicitly supplied text/checkbox fields and are scoped to the authenticated user.
export function useListingDraft(kind, userId, values, restore) {
  const key = `listing-draft:${kind}:${userId}`;
  const [ready, setReady] = useState(false);
  const cleared = useRef(false);
  const restoreRef = useRef(restore);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try { const saved = sessionStorage.getItem(key); if (saved) restoreRef.current(JSON.parse(saved)); } catch { /* Storage may be unavailable. */ }
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, [key]);
  useEffect(() => {
    if (!ready || cleared.current) return;
    try { sessionStorage.setItem(key, JSON.stringify(values)); } catch { /* Storage may be unavailable. */ }
  }, [key, ready, values]);
  return { ready, clear: () => { cleared.current = true; try { sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ } } };
}

export function validImages(files) {
  return files.every((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024);
}
