import { useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { getPublicLocation } from '../utils/location';
import { getSaleStatus, saleStatusLabel } from '../utils/saleTime';
import './ui.css';
import './SaleCard.css';

function formatSaleDate(sale) {
  if (!sale.start_time) return 'Date to be announced';
  return new Date(sale.start_time).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function SaleCard({ sale, now }) {
  const navigate = useNavigate();
  const status = getSaleStatus(sale, now);
  return <article className="sale-card ui-card" tabIndex={0} role="link" onClick={() => navigate(`/yard-sale/${sale.id}`)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') navigate(`/yard-sale/${sale.id}`); }}>
    <div className="sale-card-image">{sale.images?.[0] ? <img src={sale.images[0]} alt={sale.title} loading="lazy"/> : <span>Yard Sale</span>}</div>
    <div className="sale-card-info">
      {['upcoming', 'live'].includes(status) && <span className={`sale-card-status is-${status}`}>{saleStatusLabel(sale, now)}</span>}
      <h3>{sale.title}</h3>
      <p><CalendarDays size={14} aria-hidden="true"/> {formatSaleDate(sale)}</p>
      <p><MapPin size={14} aria-hidden="true"/> {getPublicLocation(sale.address)}</p>
    </div>
  </article>;
}

// Placeholders built from the real card markup, so loading doesn't move the page.
export function ProductSkeleton() {
  return <div className="shop-card ui-card card-skeleton" aria-hidden="true"><div className="shop-card-image"/><div className="shop-card-info"><h2>&nbsp;</h2><p className="shop-card-price">&nbsp;</p><div className="shop-card-seller"><span/><strong>&nbsp;</strong></div></div></div>;
}
export function SaleSkeleton() {
  return <div className="sale-card ui-card card-skeleton" aria-hidden="true"><div className="sale-card-image"/><div className="sale-card-info"><h3>&nbsp;</h3><p>&nbsp;</p><p>&nbsp;</p></div></div>;
}
