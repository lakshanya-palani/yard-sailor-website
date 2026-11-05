// Synthetic transport only: no live auth, RPC, channel, or payment requests.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { CartProvider } from '../src/context/CartContext';
import Orders from '../src/pages/Orders';
import Cart from '../src/pages/Cart';
import Messages from '../src/pages/Messages';

const report = document.querySelector('#report');
const root = createRoot(document.querySelector('#test-root'));
const lines = [];
const check = (condition, label) => { if (!condition) throw new Error(label); lines.push(`PASS ${label}`); report.textContent = lines.join('\n'); };
const wait = async predicate => { for (let i = 0; i < 200; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw new Error('Timed out waiting for fixture'); };
const settle = () => new Promise(resolve => setTimeout(resolve, 70));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
let subscriber, account = 'A', pendingRead, pendingAction, delayRead = false, accessedDestination = 0, pathname = '';
let messageMode = false, newMessage = false, historyAReads = 0, listReads = 0, marks = 0, lateMessageCallback;
const session = id => ({ user: { id } });
supabase.auth.getSession = async () => ({ data: { session: session(account) } });
supabase.auth.onAuthStateChange = callback => { subscriber = callback; return { data: { subscription: { unsubscribe() {} } } }; };
supabase.from = table => {
  if (table === 'messages' && messageMode) return {
    select: () => ({ eq: (_key,id) => ({ order: () => ({ order: () => ({ limit: async () => {
      if (id === 'conversation-A') historyAReads++;
      return { data: id === 'conversation-A' && newMessage ? [{id:'unseen',conversation_id:id,sender_id:'other',body:'Unseen',created_at:'2026-01-01T12:00:00Z'}] : [], error:null };
    } }) }) }) }),
    insert: () => { pendingAction = deferred(); return pendingAction.promise; },
  };
  if (table !== 'cart_items') throw new Error(`Unexpected table: ${table}`);
  return { select: () => ({ eq: async () => ({ count: 0, error: null }) }) };
};
supabase.channel = name => { const channel = { on: (_event, filter, callback) => { if (messageMode && name.endsWith('conversation-A') && filter.table === 'messages') lateMessageCallback = callback; return channel; }, subscribe: () => channel }; return channel; };
supabase.removeChannel = () => {};
const order = id => ({ id: `order-${id}`, state: 'open', is_buyer: true, created_at: '2026-01-01T12:00:00Z', amount_total: 1000, items: [{ product_id: `item-${id}`, title: `Order item ${id}`, unit_amount: 1000 }] });
const item = id => ({ product_id: `item-${id}`, title: `Cart item ${id}`, price: 10, available: true, seller_name: 'Fixture seller' });
const conversation = id => ({ id: `conversation-${id}`, other_name: `Contact ${id}`, last_body: `Message ${id}` });
supabase.rpc = async name => {
  const requestAccount = account;
  if (messageMode && name === 'mark_product_conversation_read') { marks++; return { data:null, error:null }; }
  if (messageMode && name === 'list_product_conversations') { listReads++; return { data:[conversation('A'),conversation('B')], error:null }; }
  if (name === 'open_product_conversation') { pendingAction = deferred(); return pendingAction.promise; }
  const data = name === 'list_my_checkout_orders' ? [order(requestAccount)] : name === 'review_product_checkout' ? [item(requestAccount)] : name === 'list_product_conversations' ? [conversation(requestAccount)] : null;
  if (!data) throw new Error(`Unexpected RPC: ${name}`);
  if (delayRead && requestAccount === 'A') { pendingRead = deferred(); return pendingRead.promise; }
  return { data, error: null };
};
Object.defineProperty(supabase, 'functions', { configurable: true, value: { invoke: async () => { pendingAction = deferred(); return pendingAction.promise; } } });
export function CheckoutFixture() { return <Cart checkout />; }
export function LocationProbe() { pathname = useLocation().pathname; return null; }
function mount(Page, path = '/') { root.render(<MemoryRouter key={path} initialEntries={[path]}><CartProvider><LocationProbe /><Page /></CartProvider></MemoryRouter>); }
function switchAccount(id) { account = id; subscriber('SIGNED_IN', session(id)); }
const content = () => document.querySelector('#test-root').textContent;
const click = text => { const button = [...document.querySelectorAll('#test-root button')].find(node => node.textContent.includes(text)); if (!button) throw new Error(`Button missing: ${text}`); button.click(); };

try {
  delayRead = true; mount(Orders, '/orders');
  await wait(() => pendingRead && subscriber);
  switchAccount('B');
  await wait(() => content().includes('Order item B'));
  pendingRead.resolve({ data: [order('A')], error: null });
  await settle();
  check(content().includes('Order item B') && !content().includes('Order item A'), 'late orders response cannot appear under the next account');

  delayRead = false; pendingAction = null; switchAccount('A');
  await wait(() => content().includes('Order item A'));
  click('Resume checkout'); await wait(() => pendingAction);
  switchAccount('B'); await wait(() => content().includes('Order item B'));
  pendingAction.resolve({ data: { get url() { accessedDestination++; return ''; } }, error: null });
  await settle();
  check(accessedDestination === 0 && pathname === '/orders' && !content().includes('Order item A'), 'late checkout action cannot redirect or replace the next account');

  switchAccount('A'); delayRead = true; pendingRead = null; mount(CheckoutFixture, '/checkout');
  await wait(() => pendingRead);
  switchAccount('B'); await wait(() => content().includes('Cart item B'));
  pendingRead.resolve({ data: [item('A')], error: null }); await settle();
  check(content().includes('Cart item B') && !content().includes('Cart item A'), 'late cart response cannot appear under the next account');
  delayRead = false; pendingAction = null; switchAccount('A'); await wait(() => content().includes('Cart item A'));
  click('Message Seller'); await wait(() => pendingAction);
  switchAccount('B'); await wait(() => content().includes('Cart item B'));
  pendingAction.resolve({ data: 'conversation-A', error: null }); await settle();
  check(pathname === '/checkout' && !content().includes('Cart item A'), 'late message action cannot navigate the next account');

  switchAccount('A'); delayRead = true; pendingRead = null; mount(Messages, '/messages');
  await wait(() => pendingRead);
  switchAccount('B'); await wait(() => content().includes('Contact B'));
  pendingRead.resolve({ data: [conversation('A')], error: null }); await settle();
  check(content().includes('Contact B') && !content().includes('Contact A'), 'late conversations response cannot appear under the next account');
  delayRead = false; messageMode = true; pendingAction = null; switchAccount('A');
  Object.defineProperty(document, 'hasFocus', { configurable:true, value:() => true });
  mount(Messages, '/messages?conversation=conversation-A');
  await wait(() => document.querySelector('#message-body') && lateMessageCallback);
  const textarea = document.querySelector('#message-body');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Hello');
  textarea.dispatchEvent(new Event('input', { bubbles:true }));
  await wait(() => !document.querySelector('.dm-compose button').disabled);
  document.querySelector('.dm-compose').dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
  await wait(() => pendingAction);
  click('Contact B'); await wait(() => document.querySelector('.dm-header')?.textContent.includes('Contact B'));
  await settle();
  newMessage = true;
  const beforeHistory = historyAReads, beforeList = listReads, beforeMarks = marks;
  lateMessageCallback();
  pendingAction.resolve({ error:null }); await settle();
  check(historyAReads === beforeHistory && listReads === beforeList && marks === beforeMarks,
    'departed conversation does not refresh or mark unseen messages after a delayed send');
  document.title = 'Account isolation checks passed';
  report.textContent += '\n6 checks passed using synthetic transport only.';
} catch (error) {
  report.textContent += `\nFAIL ${error.message}`;
  document.title = 'Account isolation checks FAILED';
}
