import { supabase } from "./supabase";

const BATCH_SIZE = 100;
const PROFILE_COLUMNS = "id, username, avatar_url";

/**
 * Batched seller lookups shared by Shop and Saved Items.
 *
 * `strict` throws the query error (Saved Items shows a retry state); otherwise
 * the failure is logged and an empty map is returned so Shop can keep rendering.
 * Ids are deduped and sent 100 at a time to stay inside Supabase's `in` limit.
 */
export async function fetchProfilesByIds(ids, { client = supabase, strict = false, errorLog = "Unable to load profiles:" } = {}) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return {};

  const profiles = [];
  for (let start = 0; start < uniqueIds.length; start += BATCH_SIZE) {
    const { data, error } = await client
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .in("id", uniqueIds.slice(start, start + BATCH_SIZE));
    if (error) {
      if (strict) throw error;
      console.error(errorLog, error);
      return {};
    }
    profiles.push(...(data || []));
  }

  return Object.fromEntries(profiles.map(profile => [profile.id, profile]));
}
