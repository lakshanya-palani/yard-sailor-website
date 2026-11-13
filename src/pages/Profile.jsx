import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { safeRedirect } from '../lib/redirect';
import { uploadImage } from '../lib/uploads';
import { savePublicProfile, usernameError } from '../lib/profileEditor';
import { AccountLayout } from '../components/layout/AccountLayout';
import { PageShell } from '../components/layout/PageShell';
import { FormActions, FormCard, FormSection } from '../components/layout/FormLayout';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { TextInput } from '../components/ui/TextInput';
import { FormAlert } from '../components/ui/FormAlert';
import { StatusMessage } from '../components/ui/StatusMessage';
import './Profile.css';

const EMPTY = { username: '', avatar_url: '' };
const TITLE = { setup: 'Set Up Your Profile', edit: 'Edit Profile' };
const SUBTITLE = 'Your username and photo appear with your listings and conversations.';

export default function Profile({ setup = false }) {
  const [user, setUser] = useState(null), [draft, setDraft] = useState(EMPTY), [saved, setSaved] = useState(EMPTY);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(''), [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false);
  const [error, setError] = useState(''), [status, setStatus] = useState(''), [touched, setTouched] = useState(false);
  const busy = useRef(false), input = useRef(null), usernameInput = useRef(null);
  const navigate = useNavigate(); const [params] = useSearchParams();
  const dirty = draft.username !== saved.username || draft.avatar_url !== saved.avatar_url;
  const validation = touched ? usernameError(draft.username) : '';

  // Kept as a hand-written effect (not useAsync): the retry counter re-runs it and
  // a successful load seeds two pieces of state (draft + saved) at once.
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setLoadError('');
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth?.user) throw new Error('Please log in again to edit your profile.');
        const { data, error: profileError } = await supabase.from('profiles').select('username, avatar_url').eq('id', auth.user.id).maybeSingle();
        if (profileError) throw new Error('Your profile could not be loaded. Please retry.');
        if (active) { setUser(auth.user); const initial = { username: data?.username || '', avatar_url: data?.avatar_url || '' }; setDraft(initial); setSaved(initial); }
      } catch (e) { if (active) setLoadError(e.message); } finally { if (active) setLoading(false); }
    }
    load(); return () => { active = false; };
  }, [retry]);

  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function revert() { setDraft(saved); setTouched(false); setError(''); setStatus('Changes reverted.'); }

  async function upload(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || busy.current) return;
    busy.current = true; setUploading(true); setError(''); setStatus('');
    try { const url = await uploadImage(file, 'avatars'); setDraft(value => ({ ...value, avatar_url: url })); setStatus('Photo uploaded. Save Changes to use it on your profile.'); }
    catch (e) { setError(e.message); } finally { busy.current = false; setUploading(false); }
  }

  async function save(event) {
    event.preventDefault(); if (busy.current) return;
    setTouched(true); setError(''); setStatus('');
    if (usernameError(draft.username)) { usernameInput.current?.focus(); return; }
    busy.current = true; setSaving(true);
    try {
      const result = await savePublicProfile(supabase, user.id, draft);
      setSaved(result); setDraft(result); setStatus('Your profile changes are saved.');
      window.dispatchEvent(new Event('yardSailorProfileUpdated'));
      if (setup) navigate(safeRedirect(params.get('redirect')), { replace: true });
    } catch (e) { setError(e.message); } finally { busy.current = false; setSaving(false); }
  }

  const locked = saving || uploading;
  const body = loading ? (
    <StatusMessage kind="loading" title="Loading profile…" />
  ) : loadError ? (
    <StatusMessage
      kind="error"
      title={loadError}
      onRetry={() => setRetry(v => v + 1)}
      retryLabel="Retry"
      action={<Link to="/login?redirect=%2Fprofile">Return to login</Link>}
    />
  ) : (
    <>
      <FormSection title="Public profile preview" description="Only your username and photo are shown here. Your account email stays private." stacked>
        <div className="profile-identity">
          <Avatar src={draft.avatar_url || null} name={draft.username || 'Y'} alt="Your public profile photo" size={80} />
          <strong className="profile-identity__name">{draft.username.trim() || 'Your username'}</strong>
        </div>
        <div className="profile-photo-actions">
          <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" onChange={upload} disabled={locked} />
          <Button variant="secondary" size="sm" disabled={locked} loading={uploading} onClick={() => input.current?.click()}>{uploading ? 'Uploading…' : 'Upload Photo'}</Button>
          <Button variant="secondary" size="sm" disabled={locked || !draft.avatar_url} onClick={() => { setDraft(value => ({ ...value, avatar_url: '' })); setStatus('Photo removed from preview. Save Changes to apply.'); }}>Remove Photo</Button>
        </div>
        <p className="profile-help">JPEG, PNG, or WebP · Up to 5 MB. Removing a photo changes your profile; it does not erase previously uploaded files.</p>
      </FormSection>

      <FormSection stacked>
        <form className="profile-form" onSubmit={save} noValidate aria-busy={locked}>
          <Field label="Public username" hint="3–20 letters, numbers, or underscores." error={validation} id="profile-username">
            <TextInput ref={usernameInput} value={draft.username} onChange={e => { setDraft(value => ({ ...value, username: e.target.value })); setStatus(''); }} onBlur={() => setTouched(true)} maxLength={20} autoComplete="username" disabled={locked} />
          </Field>
          <Field label="Account email (private)" id="profile-email">
            <TextInput type="email" value={user.email || ''} readOnly />
          </Field>
          {error && <FormAlert tone="error">{error}</FormAlert>}
          <p role="status" className="profile-help">{status || (dirty ? 'You have unsaved changes.' : 'No unsaved changes.')}</p>
          <FormActions>
            <Button variant="secondary" disabled={locked || !dirty} onClick={revert}>Revert Changes</Button>
            <Button type="submit" disabled={locked || (!setup && !dirty)}>{saving ? 'Saving…' : setup ? 'Complete Profile' : 'Save Changes'}</Button>
          </FormActions>
        </form>
      </FormSection>
    </>
  );

  if (setup) {
    return (
      <PageShell width="narrow">
        <FormCard title={TITLE.setup} subtitle={SUBTITLE} headingAs="h1">{body}</FormCard>
      </PageShell>
    );
  }
  return (
    <AccountLayout title={TITLE.edit} subtitle={SUBTITLE}>
      <FormCard className="profile-card">{body}</FormCard>
    </AccountLayout>
  );
}
