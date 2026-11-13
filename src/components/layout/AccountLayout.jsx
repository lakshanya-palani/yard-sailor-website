import { NavLink } from 'react-router-dom';
import { visibleAccountLinks } from '../../lib/accountLinks';
import { PageShell } from './PageShell';
import { PageHeader } from './PageHeader';
import './AccountLayout.css';

/**
 * Frame for account pages: PageShell + PageHeader + a horizontally scrolling
 * tab nav of the account links. NavLink sets aria-current="page" on the active tab.
 */
export function AccountLayout({ title, subtitle, actions, backTo, backLabel, links, width = 'default', className, children }) {
  const items = links ?? visibleAccountLinks();
  return (
    <PageShell width={width} className={['ui-account', className].filter(Boolean).join(' ')}>
      <PageHeader title={title} subtitle={subtitle} actions={actions} backTo={backTo} backLabel={backLabel} />
      <nav className="ui-account-nav" aria-label="Account">
        <ul className="ui-account-nav__list">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} end className="ui-account-nav__link">
                {Icon && <Icon size={16} aria-hidden="true" />}
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="ui-account__content">{children}</div>
    </PageShell>
  );
}
