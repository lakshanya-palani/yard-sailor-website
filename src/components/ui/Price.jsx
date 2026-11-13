import { money } from '../../lib/commerce';
import './Price.css';

/** `value` is in dollars, as stored on products. */
export function Price({ value, className }) {
  return <span className={['ui-price', className].filter(Boolean).join(' ')}>{money(value)}</span>;
}
