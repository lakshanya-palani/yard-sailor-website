import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './PageHeader.css';

/**
 * Page title block. `backTo` renders a router link above the title; pass
 * `onBack` instead when "back" is in-page state (e.g. closing a conversation).
 */
export function PageHeader({ title, subtitle, actions, backTo, onBack, backLabel = 'Back', eyebrow, className }) {
  const backContent = <><ArrowLeft size={18} aria-hidden="true" /><span>{backLabel}</span></>;
  return (
    <header className={['ui-page-header', className].filter(Boolean).join(' ')}>
      {backTo != null ? (
        <Link className="ui-page-header__back" to={backTo}>{backContent}</Link>
      ) : onBack ? (
        <button type="button" className="ui-page-header__back" onClick={onBack}>{backContent}</button>
      ) : null}
      <div className="ui-page-header__row">
        <div className="ui-page-header__text">
          {eyebrow && <p className="ui-page-header__eyebrow">{eyebrow}</p>}
          <h1 className="ui-page-header__title">{title}</h1>
          {subtitle && <p className="ui-page-header__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="ui-page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
