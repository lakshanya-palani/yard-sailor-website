// Share one SDK listener across React consumers. Supabase owns session persistence.
export function createAuthSession(auth) {
  let snapshot = { user: null, loading: true, error: null };
  let subscription;
  const listeners = new Set();
  function publish(session, error = null) {
    snapshot = { user: session?.user ?? null, loading: false, error };
    listeners.forEach(listener => listener());
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      if (!subscription) {
        let receivedEvent = false;
        const result = auth.onAuthStateChange((_event, session) => {
          receivedEvent = true;
          publish(session);
        });
        subscription = result.data.subscription;
        auth.getSession().then(({ data, error }) => {
          if (!receivedEvent) publish(data?.session, error);
        }).catch(() => {
          if (!receivedEvent) publish(null, new Error('Unable to restore your session. Please refresh and try again.'));
        });
      }
      return () => listeners.delete(listener);
    },
    dispose() {
      subscription?.unsubscribe();
      subscription = undefined;
      listeners.clear();
    },
  };
}
