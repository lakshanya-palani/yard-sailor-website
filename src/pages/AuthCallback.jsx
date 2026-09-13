import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { completeCallback, profileDestination, readReturn, clearReturn, authReturnStorage } from '../lib/authFlow';
import './Login.css';
// One exchange per page load, including React StrictMode remounts. Never log/store the code.
let completion;
export default function AuthCallback() {
  const navigate=useNavigate();const [error,setError]=useState('');const [retry,setRetry]=useState(0);const [canRetry,setCanRetry]=useState(false);
  useEffect(()=>{
    let active=true;
    if(!completion) {
      const href=window.location.href;
      completion=completeCallback(supabase,href,authReturnStorage);
      // The callback code/provider error should not remain in history or referrers.
      window.history.replaceState(window.history.state,'','/auth/callback');
    }
    completion.then(async result=>{
      if(active)setCanRetry(true);
      const destination=await profileDestination(supabase,result.userId,result.redirect);
      if(active){clearReturn(authReturnStorage);navigate(destination,{replace:true});}
    }).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[navigate,retry]);
  const redirect=readReturn(authReturnStorage);
  return <main className="login-page"><section className="login-card"><h1>Finishing sign-in</h1>
    {error?<><p role="alert">{error}</p>{canRetry && <button className="login-submit" onClick={()=>{setError('');setRetry(v=>v+1);}}>Retry session check</button>}<p><Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>Return to login</Link></p></>:<p role="status">Restoring your account…</p>}
  </section></main>;
}
