import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAsync } from "./useAsync";

/**
 * Loads the signed-in user's rows from `table` (`select *` where `ownerColumn`
 * is the user's id, newest first) for the account "My …" lists.
 *
 * - No signed-in user: logs `ownerLog` and resolves to no rows (no error shown).
 * - Query error: logs `rowsLog` and exposes it as `error` (call `reload` to retry).
 *
 * Returns { user, rows, loading, error, reload, setRows }.
 */
export function useOwnedRows({ table, ownerColumn, ownerLog = "Unable to load owner:", rowsLog = "Unable to load rows:" }) {
  const { data, error, loading, reload, setData } = useAsync(async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      console.error(ownerLog, authError);
      return { user: null, rows: [] };
    }

    const { data: rows, error: rowsError } = await supabase
      .from(table)
      .select("*")
      .eq(ownerColumn, authData.user.id)
      .order("created_at", { ascending: false });

    if (rowsError) {
      console.error(rowsLog, rowsError);
      throw rowsError;
    }
    return { user: authData.user, rows: rows || [] };
  }, [table, ownerColumn]);

  const setRows = useCallback(update => {
    setData(current => current && {
      ...current,
      rows: typeof update === "function" ? update(current.rows) : update,
    });
  }, [setData]);

  return { user: data?.user ?? null, rows: data?.rows ?? [], loading, error, reload, setRows };
}
