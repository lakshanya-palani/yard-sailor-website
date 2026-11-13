// Browser regression harness: no real OAuth navigation or account writes.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SocialLogin from '../src/components/SocialLogin';
import { supabase } from '../src/lib/supabase';

const report = document.querySelector('#report');
const lines = [];
function check(condition, name) {
  if (!condition) throw new Error(name);
  lines.push(`PASS ${name}`);
  report.textContent = lines.join('\n');
}
async function wait(predicate) {
  for (let i = 0; i < 150; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('State timed out');
}

let requests = 0, starts = 0, navigations = 0, finishOAuth;
let failSettings = false, failNavigation = false;
const busyEvents = [];
window.fetch = async input => {
  if (String(input) !== `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`) {
    throw new Error('Unexpected request blocked by test harness');
  }
  requests++;
  return failSettings
    ? new Response(null, { status: 503 })
    : Response.json({ external: { google: true, facebook: true } });
};
supabase.auth.signInWithOAuth = async () => {
  starts++;
  await new Promise(resolve => { finishOAuth = resolve; });
  return { data: { url: `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/authorize?provider=google` } };
};
function navigate() {
  if (failNavigation) throw new Error('Navigation failed. Please retry.');
  navigations++;
}
const root = createRoot(document.querySelector('#test-root'));
root.render(<StrictMode><SocialLogin navigate={navigate} onBusy={value => busyEvents.push(value)} /></StrictMode>);

try {
  await wait(() => document.querySelectorAll('.social-button').length === 2);
  const [google, facebook] = document.querySelectorAll('.social-button');
  google.click();
  google.click();
  facebook.click();
  await wait(() => starts === 1);
  check(requests === 0 && google.disabled && facebook.disabled, 'rapid clicks start one Google attempt without any settings request');
  check(google.getAttribute('aria-busy') === 'true' && document.querySelector('[role="status"]').textContent.includes('Google'), 'pending sign-in announces Google and stays visibly busy');

  finishOAuth();
  await wait(() => navigations === 1);
  // Wait through another browser task after assign() returns. This reproduces
  // the window where the old finally block unlocked the button too early.
  await new Promise(resolve => setTimeout(resolve, 30));
  google.click();
  facebook.click();
  check(google.disabled && facebook.disabled && starts === 1 && busyEvents.at(-1) === true, 'navigation keeps both providers locked without overwriting the active flow');

  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }));
  await new Promise(resolve => setTimeout(resolve, 20));
  check(google.disabled, 'ordinary pageshow cannot unlock a pending redirect');
  window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  await wait(() => !google.disabled);
  check(!facebook.disabled && busyEvents.at(-1) === false, 'Back from Google restores usable buttons');

  failSettings = true;
  facebook.click();
  await wait(() => document.querySelector('[role="alert"]')?.textContent.includes('availability'));
  check(!google.disabled && !facebook.disabled && busyEvents.at(-1) === false, 'availability failure displays an error and permits retry');
  failSettings = false;
  failNavigation = true;
  google.click();
  await wait(() => starts === 2);
  finishOAuth();
  await wait(() => document.querySelector('[role="alert"]')?.textContent.includes('Navigation failed'));
  check(!google.disabled && busyEvents.at(-1) === false, 'failed navigation unlocks sign-in for retry');
  document.title = 'Social login checks passed';
} catch (error) {
  report.textContent += `\nFAIL ${error.message}`;
  document.title = 'Social login checks FAILED';
}
