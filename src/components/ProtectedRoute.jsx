import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";

function ProtectedRoute({ children, requireProfile = false }) {
  const [user, setUser] = useState(null);
  const [profileComplete, setProfileComplete] = useState(null);
  const [profileCheckError, setProfileCheckError] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    let checkNumber = 0;
    const timers = new Set();

    async function checkAccess() {
      const currentCheck = ++checkNumber;
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      console.log("Authenticated user:", currentUser?.id);
      console.log("Requested route:", location.pathname);

      if (!active || currentCheck !== checkNumber) return;

      if (userError) {
        console.error("Unable to check authenticated user:", userError);
      }

      if (!currentUser) {
        setUser(null);
        setProfileComplete(false);
        setProfileCheckError(null);
        setLoading(false);
        return;
      }

      if (!requireProfile) {
        setUser(currentUser);
        setProfileComplete(true);
        setProfileCheckError(null);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", currentUser.id)
        .maybeSingle();

      console.log("Profile check result:", profile);
      console.log("Username:", profile?.username);
      console.log(
        "Profile complete:",
        Boolean(profile?.username?.trim())
      );

      if (!active || currentCheck !== checkNumber) return;

      setUser(currentUser);

      if (profileError) {
        console.error("Profile completion check failed:", profileError);
        setProfileCheckError(profileError);
        setProfileComplete(null);
      } else {
        setProfileCheckError(null);
        setProfileComplete(Boolean(profile?.username?.trim()));
      }

      setLoading(false);
    }

    function scheduleCheck() {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (active) {
          checkAccess();
        }
      }, 0);
      timers.add(timer);
    }

    scheduleCheck();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => scheduleCheck());

    window.addEventListener("yardSailorProfileUpdated", scheduleCheck);

    return () => {
      active = false;
      checkNumber += 1;
      timers.forEach((timer) => window.clearTimeout(timer));
      subscription.unsubscribe();
      window.removeEventListener("yardSailorProfileUpdated", scheduleCheck);
    };
  }, [location.pathname, requireProfile]);

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

  if (requireProfile && profileCheckError) {
    return null;
  }

  if (requireProfile && profileComplete === false) {
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
