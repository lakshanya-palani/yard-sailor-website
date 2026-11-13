import { supabase } from "./supabase";

/**
 * Cancels (hard-deletes) one of the owner's product postings. The delete is
 * scoped to `userId` so it can only remove the caller's own row. On success it
 * fires `yardSailorProductsUpdated` so product lists refresh.
 * Resolves to { error } (null on success); confirmation is the caller's job.
 */
export async function cancelProductPosting(productId, userId) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("user_id", userId);

  if (error) {
    console.error("Unable to cancel posting:", error);
    return { error };
  }

  window.dispatchEvent(new Event("yardSailorProductsUpdated"));
  return { error: null };
}
