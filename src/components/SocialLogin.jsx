import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { startSocial, authReturnStorage } from '../lib/authFlow';
import { Button } from './ui/Button';
import { FormAlert } from './ui/FormAlert';
import '../pages/Login.css';
const noop = () => {};
const PROVIDERS = [['google','Google','/images/Google.svg','google-icon'],['facebook','Facebook','/images/fbicon.png','facebook-icon']];
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
  return <div className="social-auth-options">
    <div className="social-login">
      {PROVIDERS.map(([provider,name,icon,style])=>(
        <Button
          key={provider}
          variant="secondary"
          block
          className="social-button"
          icon={<img src={icon} className={`social-button__icon ${style}`} alt=""/>}
          loading={busy===provider}
          disabled={disabled||!!busy}
          aria-busy={busy===provider}
          onClick={()=>start(provider)}
        >
          {busy===provider?`Opening ${name}…`:`Continue with ${name}`}
        </Button>
      ))}
    </div>
    {busy && <p className="social-auth-status" role="status">Connecting to {busy==='google'?'Google':'Facebook'}… Please wait.</p>}
    {error && <FormAlert>{error}</FormAlert>}
  </div>;
}
