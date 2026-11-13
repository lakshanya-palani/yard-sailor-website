// Synthetic reads and local blobs only; no live account or database writes.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { useAsync } from '../src/hooks/useAsync';
import { supabase } from '../src/lib/supabase';
import { ToastProvider } from '../src/components/ui/Toast';
import { ConfirmProvider } from '../src/components/ui/ConfirmDialog';
import { OwnerActions } from '../src/components/listing/OwnerActions';
import { CartProvider } from '../src/context/CartContext';
import { SavedProvider } from '../src/context/SavedContext';
import ProductDetail from '../src/pages/ProductDetail';
import SaleDetail from '../src/pages/SaleDetail';
import EditProduct from '../src/pages/EditProduct';
import EditYardSale from '../src/pages/EditYardSale';
import Products from '../src/components/Products';
import { ListingSkeletonGroup } from '../src/components/listing/ListingSkeleton';
import '../src/pages/HomePage.css';
import '../src/styles/tokens.css';
import '../src/styles/base.css';

const report = document.querySelector('#report');
const root = createRoot(document.querySelector('#test-root'));
const lines = [];
const check = (ok, label) => { if (!ok) throw new Error(label); lines.push(`PASS ${label}`); report.textContent = lines.join('\n'); };
const wait = async predicate => { for (let i = 0; i < 200; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw new Error('Timed out waiting for fixture'); };
const settle = () => new Promise(resolve => setTimeout(resolve, 60));
let api;
export function AsyncProbe({ load, requestKey = 'one' }) {
  api = useAsync(load, [requestKey]);
  return <p>{api.loading ? 'Pending' : api.error ? 'Failed' : api.data}</p>;
}
const pending = [];
const load = () => new Promise((resolve, reject) => pending.push({ resolve, reject }));
function mountProbe(key = 'one') { root.render(<StrictMode><AsyncProbe load={load} requestKey={key} /></StrictMode>); }
let session = { user: { id: 'fixture-buyer' } }, authChanged, productReads = 0;
supabase.auth.getSession = async () => ({ data: { session } });
supabase.auth.getUser = async () => ({ data: { user: session.user } });
supabase.auth.onAuthStateChange = callback => { authChanged = callback; return { data: { subscription: { unsubscribe() {} } } }; };
Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
let delayedProduct, delayedMessage, profileError = false, missing = false;
supabase.from = table => {
  let id, profileIds = [], queryLimit;
  const query = {
    select: () => query,
    eq: (key, value) => { if (key === 'id') id = value; return query; },
    order: () => query,
    limit: count => { queryLimit = count; return query; },
    in: (_column, values) => { profileIds = values; return query; },
    then: resolve => resolve(table === 'profiles' ? { data: profileError ? null : profileIds.map(id => ({ id, username: 'Fixture seller' })), error: profileError ? new Error('Synthetic profile failure') : null } : table === 'products' && queryLimit ? (productReads++, { data: [{ id: 'home', title: 'Homepage find', description: 'A useful description of this find.', user_id: 'fixture-owner', price: 12, pickup: true }], error: null }) : { data: [], count: 0, error: null }),
    maybeSingle: async () => {
      if (table === 'profiles') return { data: { username: 'Fixture seller' }, error: null };
      if (id === 'slow') return new Promise(resolve => { delayedProduct = resolve; });
      if (id === 'missing' || missing) return { data: null, error: null };
      return { data: { id, title: `${table} ${id}`, user_id: 'fixture-owner', host_id: 'fixture-owner', description: 'Fixture description', price: 12, category: 'furniture', condition: 'Good', pickup: true, images: [], image_urls: [], start_time: '2099-01-01T10:00:00Z', end_time: '2099-01-01T12:00:00Z' }, error: null };
    },
  };
  return query;
};
supabase.rpc = async name => name === 'open_product_conversation' ? new Promise(resolve => { delayedMessage = resolve; }) : { data: [], error: null };
export function Providers({ children }) { return <ToastProvider><ConfirmProvider><CartProvider><SavedProvider>{children}</SavedProvider></CartProvider></ConfirmProvider></ToastProvider>; }
function mountDetail(Page, path) {
  root.render(<MemoryRouter key={`${Page.name}:${path}`} initialEntries={[path]}><Providers><Link to="/listing/missing">Missing listing</Link><Routes><Route path="/listing/:id" element={<Page />} /></Routes></Providers></MemoryRouter>);
}

let cancellations = 0;
export function ConfirmationFixture({ show }) {
  return <ConfirmProvider>{show && <OwnerActions onCancel={() => { cancellations++; }} confirm={{ title: 'Cancel fixture?', confirmLabel: 'Confirm cancellation' }} />}</ConfirmProvider>;
}

try {
  mountProbe(); await wait(() => pending.length === 1);
  api.reload(); await wait(() => pending.length === 2);
  pending[1].resolve('Newest'); await wait(() => document.querySelector('#test-root').textContent === 'Newest');
  pending[0].resolve('Stale'); await settle();
  check(api.data === 'Newest', 'StrictMode and overlapping reloads accept only the newest response');
  mountProbe('two'); await wait(() => pending.length === 3);
  pending[2].reject(new Error('Synthetic failure')); await wait(() => api.error);
  check(api.data === 'Newest' && !api.loading, 'a failed refresh retains prior data and exposes the error');
  api.reload(); await wait(() => pending.length === 4); pending[3].resolve('Recovered'); await wait(() => api.data === 'Recovered');
  check(!api.error, 'retry clears the error and replaces prior data');
  api.reload(); await wait(() => pending.length === 5);
  root.render(null); await settle(); pending[4].resolve('After unmount'); await settle();
  check(!document.querySelector('#test-root').textContent, 'pending responses do not render after unmount');

  for (const Page of [ProductDetail, SaleDetail]) {
    delayedProduct = null; mountDetail(Page, '/listing/slow'); await wait(() => delayedProduct);
    document.querySelector('#test-root a').click(); await wait(() => document.querySelector('#test-root').textContent.includes('not found'));
    delayedProduct({ data: { id: 'slow', title: 'Stale listing', user_id: 'fixture-owner', host_id: 'fixture-owner' }, error: null }); await settle();
    check(!document.querySelector('#test-root').textContent.includes('Stale listing'), `${Page.name}: late response cannot replace a different route`);
  }

  mountDetail(ProductDetail, '/listing/fast');
  await wait(() => document.querySelector('#test-root').textContent.includes('Fixture seller'));
  check(true, 'product detail maps the batched public seller profile');
  const messageButton = [...document.querySelectorAll('#test-root button')].find(button => button.textContent === 'Message Seller');
  messageButton.click(); await wait(() => delayedMessage);
  document.querySelector('#test-root a').click(); await wait(() => document.querySelector('#test-root').textContent.includes('not found'));
  delayedMessage({ data: 'departed-conversation', error: null }); await settle();
  check(document.querySelector('#test-root').textContent.includes('not found'), 'a delayed message action cannot navigate away from the next listing');
  profileError = true; mountDetail(ProductDetail, '/listing/profile-error');
  await wait(() => document.querySelector('#test-root').textContent.includes('Yard Sailor seller'));
  check(document.querySelector('#test-root').textContent.includes('products profile-error'), 'a seller-profile failure still renders the product with its fallback seller');
  profileError = false;

  const originalCreate = URL.createObjectURL.bind(URL), originalRevoke = URL.revokeObjectURL.bind(URL);
  const created = [], revoked = [];
  URL.createObjectURL = blob => { const url = originalCreate(blob); created.push(url); return url; };
  URL.revokeObjectURL = url => { revoked.push(url); originalRevoke(url); };
  for (const Page of [EditProduct, EditYardSale]) {
    missing = false; root.render(<MemoryRouter key={Page.name} initialEntries={['/listing/edit']}><Routes><Route path="/listing/:id" element={<Page />} /></Routes></MemoryRouter>);
    await wait(() => document.querySelector('input[type=file]'));
    const files = new DataTransfer(); files.items.add(new File(['synthetic'], 'fixture.png', { type: 'image/png' }));
    const input = document.querySelector('input[type=file]'); input.files = files.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(() => document.querySelector('.image-preview'));
    const preview = created.at(-1); root.render(null); await settle();
    check(revoked.includes(preview), `${Page.name}: leaving the editor releases its photo preview`);
  }
  URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke;
  root.render(<main className="home-page"><ListingSkeletonGroup className="products-grid" count={5} /></main>);
  await wait(() => document.querySelectorAll('.listing-skeleton').length === 5);
  const expectedPreviews = innerWidth <= 480 ? 1 : innerWidth <= 640 ? 2 : innerWidth <= 900 ? 3 : innerWidth <= 1024 ? 4 : 5;
  const visibleSkeletons = [...document.querySelectorAll('.listing-skeleton')].filter(element => getComputedStyle(element).display !== 'none');
  const columns = getComputedStyle(document.querySelector('.products-grid')).gridTemplateColumns.split(' ').length;
  check(visibleSkeletons.length === expectedPreviews && columns === expectedPreviews, 'homepage loading skeletons stay visible in one responsive preview row');

  root.render(<MemoryRouter><Providers><Products previewLimit={5} /></Providers></MemoryRouter>);
  await wait(() => document.querySelector('#test-root').textContent.includes('A useful description of this find.'));
  check(!document.querySelector('.listing-owner-actions'), 'homepage cards preserve descriptions and hide other sellers’ cancellation controls');
  const readsBeforeSwitch = productReads;
  session = { user: { id: 'fixture-owner' } }; authChanged('SIGNED_IN', session);
  await wait(() => document.querySelector('.listing-owner-actions'));
  session = { user: { id: 'another-buyer' } }; authChanged('SIGNED_IN', session);
  await wait(() => !document.querySelector('.listing-owner-actions'));
  check(productReads === readsBeforeSwitch, 'homepage ownership controls follow account switches without requiring a product refresh');

  root.render(<ConfirmationFixture show />);
  await wait(() => document.querySelector('.listing-owner-actions button'));
  document.querySelector('.listing-owner-actions button').click();
  await wait(() => document.querySelector('dialog')?.open);
  root.render(<ConfirmationFixture show={false} />); await settle();
  document.querySelector('dialog button[value=confirm]').click(); await settle();
  check(cancellations === 0, 'confirming after the owner action unmounts cannot cancel a departed listing');
  root.render(<ConfirmationFixture show />); await wait(() => document.querySelector('.listing-owner-actions button'));
  document.querySelector('.listing-owner-actions button').click(); await wait(() => document.querySelector('dialog')?.open);
  document.querySelector('dialog button[value=confirm]').click(); await wait(() => cancellations === 1);
  check(cancellations === 1, 'a mounted owner action cancels once after confirmation');

  document.title = 'UI consolidation checks passed'; report.textContent += `\n${lines.length} checks passed using synthetic transport only.`;
} catch (error) {
  report.textContent += `\nFAIL ${error.message}`; document.title = 'UI consolidation checks failed';
}
