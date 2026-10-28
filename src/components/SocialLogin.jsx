import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { startSocial, authReturnStorage } from '../lib/authFlow';
import '../pages/Login.css';
const noop = () => {};
const navigateToProvider = url => window.location.assign(url);
export default function SocialLogin({redirect='/',disabled=false,onBusy=noop,navigate=navigateToProvider}) {
  const [busy,setBusy]=useState(null);const [error,setError]=useState('');const running=useRef(false);
  useEffect(()=>{
    // Back from Google may restore this page with its pending button state.
    function restore(event) {
      if(!event.persisted)return;
      running.current=false;setBusy(null);onBusy(false);
    }
    window.addEventListener('pageshow',restore);
    return()=>window.removeEventListener('pageshow',restore);
  },[onBusy]);
  async function start(provider) {
    if(running.current || disabled)return;
    running.current=true;setBusy(provider);setError('');onBusy(true);
    try {
      const url=await startSocial(supabase,provider,redirect,{origin:window.location.origin,storage:authReturnStorage,supabaseUrl:import.meta.env.VITE_SUPABASE_URL,publicKey:import.meta.env.VITE_SUPABASE_ANON_KEY});
      navigate(url);
      // Navigation is asynchronous. Keep the lock until we leave so another
      // click cannot overwrite the PKCE verifier for the sign-in in progress.
    }catch(e){
      setError((e instanceof TypeError || e.name === 'TimeoutError' || e.name === 'AbortError')?'Unable to connect to sign-in. Please try again.':e.message);
      running.current=false;setBusy(null);onBusy(false);
    }
  }
  return <div className="social-auth-options"><div className="social-login">
    {[['google','Google','/images/Google.svg','google-icon'],['facebook','Facebook','/images/fbicon.png','facebook-icon']].map(([provider,name,icon,style])=><button key={provider} type="button" className="social-button" disabled={disabled||!!busy} aria-busy={busy===provider} onClick={()=>start(provider)}><img src={icon} className={style} alt=""/>{busy===provider?`Opening ${name}…`:`Continue with ${name}`}</button>)}
  </div>{busy && <p role="status">Connecting to {busy==='google'?'Google':'Facebook'}… Please wait.</p>}<p role="alert">{error}</p></div>;
}
