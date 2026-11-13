import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { completeCallback, profileDestination, readReturn, clearReturn, authReturnStorage } from '../lib/authFlow';
import { AuthCard } from '../components/layout/AuthCard';
import { FormAlert } from '../components/ui/FormAlert';
import { StatusMessage } from '../components/ui/StatusMessage';
// One exchange per page load, including React StrictMode remounts. Never log/store the code.
let completion;
export default function AuthCallback() {
  const navigate=useNavigate();const location=useLocation();const [error,setError]=useState('');const [retry,setRetry]=useState(0);const [canRetry,setCanRetry]=useState(false);
  useEffect(()=>{
    let active=true;
    if(!completion || completion.key !== location.key) {
      const href=window.location.href;
      completion={key:location.key,promise:completeCallback(supabase,href,authReturnStorage)};
      // The callback code/provider error should not remain in history or referrers.
      window.history.replaceState(window.history.state,'','/auth/callback');
    }
    completion.promise.then(async result=>{
      if(active)setCanRetry(true);
      const destination=await profileDestination(supabase,result.userId,result.redirect);
      if(active){clearReturn(authReturnStorage);navigate(destination,{replace:true});}
    }).catch(e=>{if(active)setError(e instanceof TypeError ? 'Unable to connect to sign-in. Please try again.' : e.message);});
    return()=>{active=false;};
  },[navigate,retry,location.key]);
  const redirect=readReturn(authReturnStorage);
  return <AuthCard
    title="Finishing sign-in"
    footer={error ? <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>Return to login</Link> : null}
  >
    {error
      ? <FormAlert
        onRetry={canRetry ? ()=>{setError('');setRetry(v=>v+1);} : undefined}
        retryLabel="Retry session check"
      >{error}</FormAlert>
      : <StatusMessage kind="loading">Restoring your account…</StatusMessage>}
  </AuthCard>;
}
