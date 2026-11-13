import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './SectionHeader.css';

/** Section title with optional count pill, "See all" link and extra actions. */
export function SectionHeader({ title, subtitle, as: Heading = 'h2', linkTo, linkLabel = 'See all', count, actions, className }) {
  const hasAside = linkTo != null || actions;
  return (
    <div className={['ui-section-header', className].filter(Boolean).join(' ')}>
      <div className="ui-section-header__text">
        <Heading className="ui-section-header__title">
          {title}
          {count != null && <span className="ui-section-header__count">{count}</span>}
        </Heading>
        {subtitle && <p className="ui-section-header__subtitle">{subtitle}</p>}
      </div>
      {hasAside && (
        <div className="ui-section-header__aside">
          {actions}
          {linkTo != null && (
            <Link className="ui-section-header__link" to={linkTo}>
              <span>{linkLabel}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
