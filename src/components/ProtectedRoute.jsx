import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabase";

function ProtectedRoute({ children, requireProfile = false }) {
  const { user, loading: authLoading, error: authError } = useAuth();
  const [profileComplete, setProfileComplete] = useState(null);
  const [profileCheckError, setProfileCheckError] = useState(null);
  const [checkedUser, setCheckedUser] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    let checkNumber = 0;
    const timers = new Set();

    async function checkAccess() {
      const currentCheck = ++checkNumber;
      const currentUser = user;
      if (!currentUser) {
        setProfileComplete(false);
        setProfileCheckError(null);
        setCheckedUser(currentUser?.id ?? null);
        setLoading(false);
        return;
      }

      if (!requireProfile) {
        setProfileComplete(true);
        setProfileCheckError(null);
        setCheckedUser(currentUser?.id ?? null);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!active || currentCheck !== checkNumber) return;


      if (profileError) {
        console.error("Profile completion check failed:", profileError);
        setProfileCheckError(profileError);
        setProfileComplete(null);
      } else {
        setProfileCheckError(null);
        setProfileComplete(Boolean(profile?.username?.trim()));
      }

      setCheckedUser(currentUser?.id ?? null);
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

    window.addEventListener("yardSailorProfileUpdated", scheduleCheck);

    return () => {
      active = false;
      checkNumber += 1;
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("yardSailorProfileUpdated", scheduleCheck);
    };
  }, [user, location.pathname, requireProfile]);

  if (authLoading || loading || (requireProfile && user && checkedUser !== user.id)) {
    return <main><p role="status">Checking your account…</p></main>;
  }

  if (authError) return <main><p role="alert">Unable to restore your session. Please refresh and try again.</p></main>;

  if (!user) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(
          `${location.pathname}${location.search}${location.hash}`
        )}`}
        replace
      />
    );
  }

  if (requireProfile && profileCheckError) {
    return <main><p role="alert">Unable to check your profile. Please refresh and try again.</p></main>;
  }

  if (requireProfile && profileComplete === false) {
    const destination = `${location.pathname}${location.search}${location.hash}`;
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
