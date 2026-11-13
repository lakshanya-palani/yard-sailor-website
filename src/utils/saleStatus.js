import { getSaleStatus } from './saleTime';

/** True while a sale is upcoming or happening now (not ended, cancelled, completed, draft or undated). */
export function isSaleOpen(sale, now = Date.now()) {
  return ['upcoming', 'live'].includes(getSaleStatus(sale, now));
}
