import { PageShell } from './PageShell';
import './AuthCard.css';

/** Centred sign-in / sign-up card on the cream page. */
export function AuthCard({ title, subtitle, footer, className, children }) {
  return (
    <PageShell width="narrow" className="ui-auth">
      <section className={['ui-auth-card', className].filter(Boolean).join(' ')}>
        <header className="ui-auth-card__header">
          <h1 className="ui-auth-card__title">{title}</h1>
          {subtitle && <p className="ui-auth-card__subtitle">{subtitle}</p>}
        </header>
        <div className="ui-auth-card__body">{children}</div>
        {footer && <div className="ui-auth-card__footer">{footer}</div>}
      </section>
    </PageShell>
  );
}
