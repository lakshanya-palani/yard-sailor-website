// Synthetic transport: no live authentication, geocoding, uploads, or writes.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import PostYardSale from '../src/pages/PostYardSale';

let subscriber, account = 'A', pendingInsert, path = '';
const session = id => ({ user: { id } });
supabase.auth.getSession = async () => ({ data: { session: session(account) } });
supabase.auth.getUser = async () => ({ data: { user: { id: account } }, error: null });
supabase.auth.onAuthStateChange = callback => { subscriber = callback; return { data: { subscription: { unsubscribe() {} } } }; };
supabase.from = () => ({ insert: () => ({ select: () => ({ single: () => new Promise(resolve => { pendingInsert = resolve; }) }) }) });
Object.defineProperty(supabase, 'functions', { configurable: true, value: { invoke: async () => ({ data: { url: 'https://example.test/image.png' }, error: null }) } });
window.fetch = async () => ({ ok: true, json: async () => ({ features: [{ geometry: { coordinates: [-122, 37] }, place_name: 'Fixture address' }] }) });
const draft = title => ({ title, description: 'Fixture details', address: 'Fixture address', startTime: '2026-11-08T10:00', endTime: '2026-11-08T12:00' });
sessionStorage.setItem('listing-draft:yard-sale:A', JSON.stringify(draft('Draft A')));
sessionStorage.setItem('listing-draft:yard-sale:B', JSON.stringify(draft('Draft B')));
const report = document.querySelector('#report');
const wait = async predicate => { for (let i = 0; i < 200; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw new Error('Timed out waiting for fixture'); };
const check = (condition, message) => { if (!condition) throw new Error(message); report.textContent += `\nPASS ${message}`; };
export function LocationProbe() { path = useLocation().pathname; return null; }
createRoot(document.querySelector('#test-root')).render(<MemoryRouter initialEntries={['/post-yard-sale']}><LocationProbe /><PostYardSale /></MemoryRouter>);
try {
  const title = () => document.querySelector('#yard-sale-title');
  await wait(() => subscriber && title()?.value === 'Draft A' && !title().disabled);
  check(title().value === 'Draft A', 'account A draft restored');
  const transfer = new DataTransfer();
  transfer.items.add(new File(['fixture'], 'fixture.png', { type: 'image/png' }));
  const fileInput = document.querySelector('input[type=file]');
  fileInput.files = transfer.files;
  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  await wait(() => document.querySelector('.image-preview'));
  document.querySelector('form').requestSubmit();
  await wait(() => pendingInsert);
  account = 'B'; subscriber('SIGNED_IN', session('B'));
  await wait(() => title()?.value === 'Draft B');
  check(!document.querySelector('.image-preview'), 'account switch remounts form without previous photos');
  pendingInsert({ data: { id: 'created-A' }, error: null });
  await new Promise(resolve => setTimeout(resolve, 100));
  check(path === '/post-yard-sale' && title()?.value === 'Draft B', 'late create cannot redirect or alter account B');
  check(JSON.parse(sessionStorage.getItem('listing-draft:yard-sale:A')).title === 'Draft A', 'late create does not clear account A draft');
  document.title = 'Listing account isolation passed';
} catch (error) {
  report.textContent += `\nFAIL ${error.message}`;
  document.title = 'Listing account isolation FAILED';
}
