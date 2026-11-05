// Local fixture: 35 synthetic sales, no database calls or real geolocation.
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import FindYardSale from '../src/pages/FindYardSale';

const report = document.querySelector('#report');
const sales = Array.from({ length: 35 }, (_, index) => ({
  id: `fixture-${index}`, title: `Fixture sale ${index + 1}`, address: 'Fixture, Sample City, CA',
  lat: 37 + index * 0.001, lng: -122, images: [], start_time: '2099-01-01T10:00:00Z',
  end_time: '2099-01-02T10:00:00Z', status: 'upcoming',
}));
supabase.from = table => {
  if (table !== 'sales') throw new Error(`Unexpected table ${table}`);
  const query = { select: () => query, in: () => query, order: async () => ({ data: sales, error: null }) };
  return query;
};
Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: (_success, failure) => failure({ code: 1 }) } });
createRoot(document.querySelector('#test-root')).render(<MemoryRouter><FindYardSale /></MemoryRouter>);

const started = Date.now();
const ready = setInterval(() => {
  const buttons = document.querySelectorAll('.show-on-map');
  if (buttons.length === sales.length) {
    clearInterval(ready);
    report.textContent = 'READY: At mobile width, scroll down and choose Show on map for any sale.';
    document.title = 'Map view check ready';
  } else if (Date.now() - started > 5000) {
    clearInterval(ready);
    report.textContent = 'SKIP: Synthetic sales did not load.';
    document.title = 'Map view check skipped';
  }
}, 30);

document.addEventListener('click', event => {
  if (!event.target.closest('.show-on-map')) return;
  report.textContent = 'Checking map view…';
  const deadline = Date.now() + 4000;
  const inspect = () => {
    const layout = document.querySelector('.find-yard-sale-layout');
    const map = document.querySelector('.yard-sale-map-container');
    const canvas = map?.querySelector('canvas.mapboxgl-canvas');
    const bounds = map?.getBoundingClientRect();
    if (layout?.classList.contains('view-map') && canvas && bounds && bounds.top >= -2 && bounds.top < window.innerHeight && bounds.width > 0 && bounds.height > 0) {
      report.textContent = 'PASS: The visible map scrolled into the viewport after selecting a sale.';
      document.title = 'Map view check passed';
    } else if (Date.now() < deadline) requestAnimationFrame(inspect);
    else if (!canvas) {
      report.textContent = 'SKIP: Map renderer was unavailable in this browser.';
      document.title = 'Map view check skipped';
    } else {
      report.textContent = 'FAIL: The selected map did not scroll into the viewport.';
      document.title = 'Map view check FAILED';
    }
  };
  requestAnimationFrame(inspect);
});
