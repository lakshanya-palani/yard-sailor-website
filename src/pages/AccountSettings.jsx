import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AccountLayout } from '../components/layout/AccountLayout';
import { FormCard, FormSection } from '../components/layout/FormLayout';
import { Field } from '../components/ui/Field';
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import { FormAlert } from '../components/ui/FormAlert';
import { StatusMessage } from '../components/ui/StatusMessage';
import { useAsync } from '../hooks/useAsync';
import './AccountPages.css';

const PROVIDER_LABELS = { email: 'Email', google: 'Google', facebook: 'Facebook' };

async function loadAccount() {
  let result;
  try { result = await supabase.auth.getUser(); }
  catch { throw new Error('Unable to load your account. Please refresh.'); }
  if (result.error || !result.data.user) throw new Error('Unable to load your account. Please refresh or log in again.');
  return result.data.user;
}

export default function AccountSettings() {
  const { data: user, error: loadError, loading } = useAsync(loadAccount, []);
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState(''), [nonce, setNonce] = useState('');
  const [needsCode, setNeedsCode] = useState(false), [saving, setSaving] = useState(false), [status, setStatus] = useState(''), [error, setError] = useState('');
  const busy = useRef(false), passwordInput = useRef(null), confirmInput = useRef(null);
  const navigate = useNavigate();
  const providers = [...new Set((user?.identities || []).map(identity => identity.provider))];

  async function perform(action) {
    if (busy.current) return;
    busy.current = true; setSaving(true); setError(''); setStatus('');
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || data.user.id !== user.id) { setError('Your account session changed. Reload this page before continuing.'); return; }
      await action();
    } catch { setError('Unable to complete this action. Please try again.'); }
    finally { busy.current = false; setSaving(false); }
  }

  function updatePassword(event) {
    event.preventDefault(); if (busy.current) return;
    if (password.length < 8) { setError('Use at least 8 characters for your new password.'); passwordInput.current?.focus(); return; }
    if (password !== confirm) { setError('The passwords do not match.'); confirmInput.current?.focus(); return; }
    perform(async () => {
      const { error } = await supabase.auth.updateUser({ password, ...(nonce.trim() ? { nonce: nonce.trim() } : {}) });
      if (error) {
        if (error.code === 'reauthentication_needed' || error.code === 'reauthentication_not_valid') { setNeedsCode(true); setError('Request a verification code, then enter it below and retry.'); }
        else setError('Password could not be updated. Check the password requirements or sign in again and retry.');
        return;
      }
      setPassword(''); setConfirm(''); setNonce(''); setNeedsCode(false); setStatus('Password updated.');
    });
  }

  function requestCode() {
    perform(async () => {
      const { error } = await supabase.auth.reauthenticate();
      if (error) { setError('Unable to send a verification code. Please sign in again and retry.'); return; }
      setNeedsCode(true); setStatus('Verification code requested. Check the confirmed contact method on your account.');
    });
  }

  function signOut(scope) {
    perform(async () => {
      const { error } = await supabase.auth.signOut({ scope });
      if (error) throw error;
      if (scope === 'others') setStatus('Other sessions have been signed out. Existing access tokens may remain usable until they expire. This session stays signed in.');
      else navigate('/', { replace: true });
    });
  }

  return (
    <AccountLayout title="Account Settings" subtitle="Manage your sign-in methods and account security.">
      {loading ? <StatusMessage kind="loading" title="Loading account…" />
        : loadError ? <StatusMessage kind="error" title={loadError.message} />
          : (
            <FormCard className="account-settings">
              <FormSection title="Connected sign-in methods" description="Manage a Google or Facebook password with that provider. Linking and unlinking providers is not available here.">
                <ul className="account-provider-list">
                  {providers.length
                    ? providers.map(provider => <li key={provider}>{PROVIDER_LABELS[provider] || provider}</li>)
                    : <li>No sign-in methods could be listed.</li>}
                </ul>
              </FormSection>

              {providers.includes('email') && (
                <FormSection title="Change password">
                  <form className="account-settings__form" onSubmit={updatePassword} aria-busy={saving}>
                    <Field label="Account email (private)">
                      <TextInput type="email" value={user.email || ''} readOnly />
                    </Field>
                    <Field label="New password" hint="Use at least 8 characters. Your account’s server-side password rules also apply.">
                      <TextInput ref={passwordInput} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required disabled={saving} />
                    </Field>
                    <Field label="Confirm new password">
                      <TextInput ref={confirmInput} type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required disabled={saving} />
                    </Field>
                    {needsCode && (
                      <>
                        <Field label="Verification code">
                          <TextInput value={nonce} onChange={e => setNonce(e.target.value)} autoComplete="one-time-code" required disabled={saving} />
                        </Field>
                        <Button variant="secondary" disabled={saving} onClick={requestCode}>Send verification code</Button>
                      </>
                    )}
                    <Button type="submit" disabled={saving}>{saving ? 'Working…' : 'Change Password'}</Button>
                  </form>
                </FormSection>
              )}

              <FormSection title="Sessions" description="Keep this device signed in while signing out other sessions.">
                <div className="account-settings__actions">
                  <Button variant="secondary" disabled={saving} onClick={() => signOut('others')}>Sign Out Other Sessions</Button>
                  <Button variant="danger" disabled={saving} onClick={() => signOut('global')}>Sign Out Everywhere</Button>
                </div>
                {error && <FormAlert tone="error">{error}</FormAlert>}
                {status && <FormAlert tone="success">{status}</FormAlert>}
              </FormSection>

              <FormSection title="Account and privacy help" description="To request account deletion, email our support team. This opens your email app; it does not automatically delete your account. We may need to verify your identity.">
                <div className="account-settings__actions">
                  <Button variant="secondary" href="mailto:app.yardsailor@gmail.com?subject=Yard%20Sailor%20account%20deletion%20request">Request Account Deletion</Button>
                </div>
                <p className="account-settings__links"><Link to="/privacy">Read the Privacy Policy</Link> · <Link to="/profile">Edit public profile</Link></p>
              </FormSection>
            </FormCard>
          )}
    </AccountLayout>
  );
}
