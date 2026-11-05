// Synthetic transport; tests the default-disabled cart without account or payment writes.
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { CartProvider } from '../src/context/CartContext';
import { PAYMENTS_ENABLED } from '../src/lib/features';
import Cart from '../src/pages/Cart';

const report = document.querySelector('#report');
const checks = [];
const check = (condition, label) => { if (!condition) throw new Error(label); checks.push(`PASS ${label}`); report.textContent = checks.join('\n'); };
const wait = async predicate => { for (let i = 0; i < 150; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); } throw new Error('Timed out'); };
let paymentCalls = 0, removed = 0, messages = 0, route = '';
supabase.auth.getSession = async () => ({ data: { session: { user: { id: 'fixture' } } } });
supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } });
supabase.from = table => {
  if (table !== 'cart_items') throw new Error(`Unexpected table ${table}`);
  return { select: () => ({ eq: async () => ({ count: 1, error: null }) }), delete: () => ({ eq: () => ({ eq: async () => { removed++; return { error: null }; } }) }) };
};
supabase.channel = () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; };
supabase.removeChannel = () => {};
supabase.rpc = async name => {
  if (name === 'review_product_checkout') return { data: [{ product_id: 'fixture-item', title: 'Fixture item', price: 12, available: true }], error: null };
  if (name === 'open_product_conversation') { messages++; return { data: 'fixture-conversation', error: null }; }
  paymentCalls++; return { data: null, error: null };
};
Object.defineProperty(supabase, 'functions', { configurable: true, value: { invoke: async () => { paymentCalls++; return { data: null, error: null }; } } });
export function LocationProbe() { const location = useLocation(); route = `${location.pathname}${location.search}`; return null; }
createRoot(document.querySelector('#test-root')).render(<MemoryRouter initialEntries={['/cart']}><CartProvider><LocationProbe /><Cart /></CartProvider></MemoryRouter>);
try {
  await wait(() => document.querySelector('.cart-item'));
  const page = document.querySelector('#test-root');
  check(!PAYMENTS_ENABLED && !page.textContent.includes('checkout') && !page.querySelector('a[href="/orders"]'), 'default cart hides payment and order actions');
  check(page.textContent.includes('$12.00') && page.textContent.includes('Message Seller'), 'cart shows item total and seller messaging');
  [...page.querySelectorAll('button')].find(button => button.textContent === 'Message Seller').click();
  await wait(() => messages === 1 && route === '/messages?conversation=fixture-conversation');
  check(true, 'message seller opens the synthetic conversation');
  [...page.querySelectorAll('button')].find(button => button.textContent === 'Remove').click();
  await wait(() => removed === 1 && page.textContent.includes('Your cart is empty'));
  check(paymentCalls === 0, 'remove works without invoking payment functions or order RPCs');
  report.textContent += '\n4 checks passed with synthetic transport only.';
  document.title = 'Payments disabled checks passed';
} catch (error) { report.textContent += `\nFAIL ${error.message}`; document.title = 'Payments disabled checks FAILED'; }
