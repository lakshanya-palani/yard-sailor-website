import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { startSocial, authReturnStorage } from '../lib/authFlow';
import '../pages/Login.css';
export default function SocialLogin({redirect='/',disabled=false,onBusy=()=>{}}) {
  const [busy,setBusy]=useState(null);const [error,setError]=useState('');const running=useRef(false);
  async function start(provider) {
    if(running.current || disabled)return;
    running.current=true;setBusy(provider);setError('');onBusy(true);
    try {
      const url=await startSocial(supabase,provider,redirect,{origin:window.location.origin,storage:authReturnStorage,supabaseUrl:import.meta.env.VITE_SUPABASE_URL,publicKey:import.meta.env.VITE_SUPABASE_ANON_KEY});
      window.location.assign(url);
    }catch(e){setError((e instanceof TypeError || e.name === 'TimeoutError' || e.name === 'AbortError')?'Unable to connect to sign-in. Please try again.':e.message);}
    finally {running.current=false;setBusy(null);onBusy(false);}
  }
  return <div className="social-auth-options"><div className="social-login">
    {[['google','Google','/images/Google.svg','google-icon'],['facebook','Facebook','/images/fbicon.png','facebook-icon']].map(([provider,name,icon,style])=><button key={provider} type="button" className="social-button" disabled={disabled||!!busy} onClick={()=>start(provider)}><img src={icon} className={style} alt=""/>{busy===provider?'Opening…':`Continue with ${name}`}</button>)}
  </div><p role="alert">{error}</p></div>;
}
