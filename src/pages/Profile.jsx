import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { safeRedirect } from '../lib/redirect';
import { uploadImage } from '../lib/uploads';
import { savePublicProfile, usernameError } from '../lib/profileEditor';
import './Profile.css';
const EMPTY = {username:'', avatar_url:''};
export default function Profile({setup=false}) {
  const [user,setUser]=useState(null), [draft,setDraft]=useState(EMPTY), [saved,setSaved]=useState(EMPTY);
  const [loading,setLoading]=useState(true), [loadError,setLoadError]=useState(''), [retry,setRetry]=useState(0);
  const [saving,setSaving]=useState(false), [uploading,setUploading]=useState(false);
  const [error,setError]=useState(''), [status,setStatus]=useState(''), [touched,setTouched]=useState(false);
  const busy=useRef(false), input=useRef(null), usernameInput=useRef(null);
  const navigate=useNavigate(); const [params]=useSearchParams();
  const dirty=draft.username!==saved.username || draft.avatar_url!==saved.avatar_url;
  const validation=touched ? usernameError(draft.username) : '';
  useEffect(()=>{
    let active=true;
    async function load() {
      setLoading(true);setLoadError('');
      try {
        const {data:auth,error:authError}=await supabase.auth.getUser();
        if(authError || !auth?.user) throw new Error('Please log in again to edit your profile.');
        const {data,error:profileError}=await supabase.from('profiles').select('username, avatar_url').eq('id',auth.user.id).maybeSingle();
        if(profileError)throw new Error('Your profile could not be loaded. Please retry.');
        if(active){setUser(auth.user);const initial={username:data?.username||'',avatar_url:data?.avatar_url||''};setDraft(initial);setSaved(initial);}
      }catch(e){if(active)setLoadError(e.message);}finally{if(active)setLoading(false);}
    }
    load();return()=>{active=false;};
  },[retry]);
  useEffect(()=>{
    if(!dirty)return;
    const warn=event=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);
  function revert(){setDraft(saved);setTouched(false);setError('');setStatus('Changes reverted.');}
  async function upload(event){
    const file=event.target.files?.[0];event.target.value='';
    if(!file || busy.current)return;
    busy.current=true;setUploading(true);setError('');setStatus('');
    try{const url=await uploadImage(file,'avatars');setDraft(value=>({...value,avatar_url:url}));setStatus('Photo uploaded. Save Changes to use it on your profile.');}
    catch(e){setError(e.message);}finally{busy.current=false;setUploading(false);}
  }
  async function save(event){
    event.preventDefault();if(busy.current)return;
    setTouched(true);setError('');setStatus('');
    if(usernameError(draft.username)){usernameInput.current?.focus();return;}
    busy.current=true;setSaving(true);
    try{
      const result=await savePublicProfile(supabase,user.id,draft);
      setSaved(result);setDraft(result);setStatus('Your profile changes are saved.');
      window.dispatchEvent(new Event('yardSailorProfileUpdated'));
      if(setup)navigate(safeRedirect(params.get('redirect')),{replace:true});
    }catch(e){setError(e.message);}finally{busy.current=false;setSaving(false);}
  }
  return <main className="profile-page"><section className="profile-card">
    <div className="profile-heading"><h1>{setup?'Set Up Your Profile':'Edit Profile'}</h1><p>Your username and photo appear with your listings and conversations.</p></div>
    {loading?<p role="status">Loading profile…</p>:loadError?<><p role="alert">{loadError}</p><button className="profile-save-button" onClick={()=>setRetry(v=>v+1)}>Retry</button><p><Link to="/login?redirect=%2Fprofile">Return to login</Link></p></>:<>
      <section className="profile-preview" aria-labelledby="profile-preview-title"><h2 id="profile-preview-title">Public profile preview</h2><div className="profile-preview-identity"><div className="profile-avatar">{draft.avatar_url?<img src={draft.avatar_url} alt="Your public profile photo"/>:<span aria-hidden="true">{draft.username.charAt(0).toUpperCase()||'Y'}</span>}</div><strong>{draft.username.trim()||'Your username'}</strong></div><p>Only your username and photo are shown here. Your account email stays private.</p></section>
      <div className="profile-photo-actions"><input ref={input} className="profile-file-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" onChange={upload} disabled={saving||uploading}/><button type="button" className="profile-secondary" disabled={saving||uploading} onClick={()=>input.current?.click()}>{uploading?'Uploading…':'Upload Photo'}</button><button type="button" className="profile-secondary" disabled={saving||uploading||!draft.avatar_url} onClick={()=>{setDraft(value=>({...value,avatar_url:''}));setStatus('Photo removed from preview. Save Changes to apply.');}}>Remove Photo</button></div>
      <p className="profile-help">JPEG, PNG, or WebP · Up to 5 MB. Removing a photo changes your profile; it does not erase previously uploaded files.</p>
      <form className="profile-form" onSubmit={save} noValidate aria-busy={saving||uploading}>
        <label htmlFor="profile-username">Public username</label><input ref={usernameInput} id="profile-username" value={draft.username} onChange={e=>{setDraft(value=>({...value,username:e.target.value}));setStatus('');}} onBlur={()=>setTouched(true)} maxLength={20} autoComplete="username" disabled={saving||uploading} aria-invalid={!!validation} aria-describedby="profile-username-help profile-username-error"/>
        <span id="profile-username-help" className="profile-help">3–20 letters, numbers, or underscores.</span><span id="profile-username-error" className="profile-error">{validation}</span>
        <label htmlFor="profile-email">Account email (private)</label><input id="profile-email" type="email" value={user.email||''} readOnly/>
        <p role="alert" className="profile-error">{error}</p><p role="status">{status || (dirty?'You have unsaved changes.':'No unsaved changes.')}</p>
        <button className="profile-save-button" disabled={saving||uploading||(!setup&&!dirty)}>{saving?'Saving…':setup?'Complete Profile':'Save Changes'}</button><button type="button" className="profile-secondary" disabled={saving||uploading||!dirty} onClick={revert}>Revert Changes</button>
      </form>
      {!setup && <nav className="profile-account-links" aria-label="Your marketplace and account"><h2>Your marketplace</h2><Link to="/my-postings">My Postings ↗</Link><Link to="/my-yard-sales">My Yard Sale Listings ↗</Link><Link to="/settings">Security & account settings ↗</Link><p className="profile-help">Save or revert your edits before leaving this page.</p></nav>}
    </>}
  </section></main>;
}
