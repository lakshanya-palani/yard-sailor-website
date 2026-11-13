import { Heart, LifeBuoy, MessageSquare, Package, Receipt, Settings, Store, UserRound } from 'lucide-react';
import { PAYMENTS_ENABLED } from './features';

/**
 * Account destinations, in the order of the Navbar profile menu. Labels match
 * that menu. `feature` names a flag in FEATURE_FLAGS; the link is hidden while
 * the flag is off (Orders only exists when payments are enabled).
 */
export const ACCOUNT_LINKS = [
  { to: '/profile', label: 'Edit Profile', icon: UserRound },
  { to: '/my-postings', label: 'My Postings', icon: Package },
  { to: '/my-yard-sales', label: 'My Yard Sale Listings', icon: Store },
  { to: '/orders', label: 'Orders', icon: Receipt, feature: 'payments' },
  { to: '/messages', label: 'Direct Messages', icon: MessageSquare },
  { to: '/saved', label: 'Saved Items', icon: Heart },
  { to: '/settings', label: 'Account Settings', icon: Settings },
  { to: '/help', label: 'Help & Support', icon: LifeBuoy },
];

export const FEATURE_FLAGS = { payments: PAYMENTS_ENABLED };

/** ACCOUNT_LINKS minus any whose feature flag is off. Pass `flags` to override (tests, demos). */
export function visibleAccountLinks(flags = FEATURE_FLAGS, links = ACCOUNT_LINKS) {
  return links.filter(link => !link.feature || Boolean(flags[link.feature]));
}
