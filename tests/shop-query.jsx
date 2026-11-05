// Synthetic query builder: records the real Shop component's transport calls.
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Shop from '../src/pages/Shop';
import { supabase } from '../src/lib/supabase';
const report = document.querySelector('#report');
const calls = [];
const builder = {
  select: (...args) => { calls.push(['select', ...args]); return builder; },
  or: value => { calls.push(['or', value]); return builder; },
  eq: (...args) => { calls.push(['eq', ...args]); return builder; },
  gte: (...args) => { calls.push(['gte', ...args]); return builder; },
  lte: (...args) => { calls.push(['lte', ...args]); return builder; },
  order: (...args) => { calls.push(['order', ...args]); return builder; },
  range: (...args) => { calls.push(['range', ...args]); return builder; },
  then: resolve => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
};
supabase.from = table => { if (table !== 'products') throw new Error(`Unexpected table ${table}`); return builder; };
const query = new URLSearchParams({ q: 'a,"b\\c', condition: 'Good', min: '5', max: '20', sort: 'price-low' });
createRoot(document.querySelector('#test-root')).render(<MemoryRouter initialEntries={[`/shop?${query}`]}><Shop /></MemoryRouter>);
try {
  for (let i = 0; i < 100 && !calls.some(call => call[0] === 'range'); i++) await new Promise(resolve => setTimeout(resolve, 20));
  const includes = expected => calls.some(call => JSON.stringify(call) === JSON.stringify(expected));
  const checks = [
    [includes(['or', 'title.ilike."%a,\\"b\\\\c%",description.ilike."%a,\\"b\\\\c%"']), 'special search characters remain inside quoted filters'],
    [includes(['eq', 'condition', 'Good']) && includes(['gte', 'price', 5]) && includes(['lte', 'price', 20]), 'condition and price filters reach the server'],
    [calls.some(call => call[0] === 'order' && call[1] === 'price' && call[2].ascending === true), 'price sort reaches the server'],
    [includes(['range', 0, 23]), 'first request is bounded to 24 products'],
  ];
  const failed = checks.find(([ok]) => !ok);
  report.textContent = checks.map(([ok, label]) => `${ok ? 'PASS' : 'FAIL'} ${label}`).join('\n');
  document.title = failed ? 'Shop query checks FAILED' : 'Shop query checks passed';
} catch (error) { report.textContent = `FAIL ${error.message}`; document.title = 'Shop query checks FAILED'; }
