import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './AccountPages.css';

export default function AccountSettings() {
  const [user,setUser]=useState(null), [loading,setLoading]=useState(true), [loadError,setLoadError]=useState('');
  const [password,setPassword]=useState(''), [confirm,setConfirm]=useState(''), [nonce,setNonce]=useState('');
  const [needsCode,setNeedsCode]=useState(false), [saving,setSaving]=useState(false), [status,setStatus]=useState(''), [error,setError]=useState('');
  const busy=useRef(false), passwordInput=useRef(null), confirmInput=useRef(null);const navigate=useNavigate();
  useEffect(()=>{let active=true;supabase.auth.getUser().then(({data,error})=>{if(active){if(error||!data.user)setLoadError('Unable to load your account. Please refresh or log in again.');else setUser(data.user);}}).catch(()=>{if(active)setLoadError('Unable to load your account. Please refresh.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  const providers=[...new Set((user?.identities||[]).map(identity=>identity.provider))];
  async function perform(action){
    if(busy.current)return;busy.current=true;setSaving(true);setError('');setStatus('');
    try{
      const {data,error}=await supabase.auth.getUser();
      if(error || !data.user || data.user.id!==user.id){setError('Your account session changed. Reload this page before continuing.');return;}
      await action();
    }catch{setError('Unable to complete this action. Please try again.');}finally{busy.current=false;setSaving(false);}
  }
  function updatePassword(event){
    event.preventDefault();if(busy.current)return;
    if(password.length<8){setError('Use at least 8 characters for your new password.');passwordInput.current?.focus();return;}
    if(password!==confirm){setError('The passwords do not match.');confirmInput.current?.focus();return;}
    perform(async()=>{
      const {error}=await supabase.auth.updateUser({password,...(nonce.trim()?{nonce:nonce.trim()}:{})});
      if(error){
        if(error.code==='reauthentication_needed'||error.code==='reauthentication_not_valid'){setNeedsCode(true);setError('Request a verification code, then enter it below and retry.');}
        else setError('Password could not be updated. Check the password requirements or sign in again and retry.');
        return;
      }
      setPassword('');setConfirm('');setNonce('');setNeedsCode(false);setStatus('Password updated.');
    });
  }
  function requestCode(){perform(async()=>{const {error}=await supabase.auth.reauthenticate();if(error){setError('Unable to send a verification code. Please sign in again and retry.');return;}setNeedsCode(true);setStatus('Verification code requested. Check the confirmed contact method on your account.');});}
  function signOut(scope){perform(async()=>{const {error}=await supabase.auth.signOut({scope});if(error)throw error;if(scope==='others')setStatus('Other sessions have been signed out. Existing access tokens may remain usable until they expire. This session stays signed in.');else navigate('/',{replace:true});});}
  return <main className="account-page account-security"><div className="account-container"><div className="account-heading"><h1>Account Settings</h1><p>Manage your sign-in methods and account security.</p></div>
    {loading?<p role="status">Loading account…</p>:loadError?<p role="alert">{loadError}</p>:<section className="account-form-card">
      <h2>Connected sign-in methods</h2><ul>{providers.length?providers.map(provider=><li key={provider}>{({email:'Email',google:'Google',facebook:'Facebook'})[provider]||provider}</li>):<li>No sign-in methods could be listed.</li>}</ul><p>Manage a Google or Facebook password with that provider. Linking and unlinking providers is not available here.</p>
      {providers.includes('email') && <><h2>Change password</h2><form className="account-form" onSubmit={updatePassword} aria-busy={saving}>
        <label>Account email (private)<input type="email" value={user.email||''} readOnly/></label>
        <label>New password<input ref={passwordInput} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required disabled={saving}/></label><p>Use at least 8 characters. Your account’s server-side password rules also apply.</p>
        <label>Confirm new password<input ref={confirmInput} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required disabled={saving}/></label>
        {needsCode && <><label>Verification code<input value={nonce} onChange={e=>setNonce(e.target.value)} autoComplete="one-time-code" required disabled={saving}/></label><button type="button" className="account-button-secondary" disabled={saving} onClick={requestCode}>Send verification code</button></>}
        <button className="account-button" disabled={saving}>{saving?'Working…':'Change Password'}</button>
      </form></>}
      <h2>Sessions</h2><p>Keep this device signed in while signing out other sessions.</p><div className="account-actions"><button className="account-button-secondary" disabled={saving} onClick={()=>signOut('others')}>Sign Out Other Sessions</button><button className="account-button-danger" disabled={saving} onClick={()=>signOut('global')}>Sign Out Everywhere</button></div>
      <p role="alert">{error}</p><p role="status">{status}</p>
      <h2>Account and privacy help</h2><p>To request account deletion, email our support team. This opens your email app; it does not automatically delete your account. We may need to verify your identity.</p><a className="account-button-secondary" href="mailto:app.yardsailor@gmail.com?subject=Yard%20Sailor%20account%20deletion%20request">Request Account Deletion</a><p><Link to="/privacy">Read the Privacy Policy</Link> · <Link to="/profile">Edit public profile</Link></p>
    </section>}
  </div></main>;
}
