import { useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase';
import { createAuthSession } from '../lib/authSession';

const session = createAuthSession(supabase.auth);
export function useAuth() {
  return useSyncExternalStore(session.subscribe, session.getSnapshot);
}
if (import.meta.hot) import.meta.hot.dispose(() => session.dispose());
