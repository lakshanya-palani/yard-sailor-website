import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

function ProtectedRoute({ children, requireProfile = false }) {
  const [user, setUser] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    async function applySession(session) {
      const currentUser = session?.user ?? null;
      let profileComplete = false;

      if (currentUser && requireProfile) {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (error) {
          console.error("Unable to check profile completion:", error);
        }

        profileComplete = Boolean(data?.username?.trim());
      }

      if (active) {
        setUser(currentUser);
        setHasProfile(profileComplete);
        setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Unable to read auth session:", error);
      }
      applySession(data?.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [requireProfile]);

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(
          `${location.pathname}${location.search}`
        )}`}
        replace
      />
    );
  }

  if (requireProfile && !hasProfile) {
    const destination = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/profile/setup?redirect=${encodeURIComponent(destination)}`}
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;
