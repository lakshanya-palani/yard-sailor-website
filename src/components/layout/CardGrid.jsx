import { Children, Fragment, isValidElement } from 'react';
import './CardGrid.css';

const GAPS = new Set(['sm', 'md', 'lg']);

// Children.toArray flattens arrays but keeps Fragments whole; unwrap those too
// so every card gets its own <li>.
function flatten(children, prefix = '') {
  return Children.toArray(children).flatMap(child => {
    if (isValidElement(child) && child.type === Fragment) {
      return flatten(child.props.children, `${prefix}${child.key ?? ''}/`);
    }
    return [{ child, key: `${prefix}${isValidElement(child) && child.key != null ? child.key : ''}` }];
  });
}

function columnVars(columns) {
  if (columns == null) return null;
  // A bare number means "this many on desktop": 1 on phones, up to 2 on tablets.
  const spec = typeof columns === 'number' ? { base: 1, md: Math.min(columns, 2), lg: columns } : columns;
  const vars = {};
  if (spec.base != null) vars['--cols-base'] = spec.base;
  if (spec.md != null) vars['--cols-md'] = spec.md;
  if (spec.lg != null) vars['--cols-lg'] = spec.lg;
  return vars;
}

/**
 * Responsive card grid. Default: auto-fill columns at least `min` px wide.
 * `columns={{ base, md, lg }}` switches to fixed counts at 0 / 640 / 1024px.
 * `as="ul"` wraps each child in an <li>. `limit` caps the number of items.
 */
export function CardGrid({ min = 220, columns, gap = 'md', as = 'div', limit, className, style, children }) {
  const fixed = columns != null;
  const classes = [
    'ui-card-grid',
    `ui-card-grid--gap-${GAPS.has(gap) ? gap : 'md'}`,
    fixed && 'ui-card-grid--fixed',
    as === 'ul' && 'ui-card-grid--list',
    className,
  ].filter(Boolean).join(' ');
  const gridStyle = { '--card-min': `${min}px`, ...columnVars(columns), ...style };

  let items = flatten(children);
  if (limit != null) items = items.slice(0, limit);

  if (as === 'ul') {
    return (
      <ul className={classes} style={gridStyle}>
        {items.map(({ child, key }, index) => (
          <li className="ui-card-grid__item" key={key || index}>{child}</li>
        ))}
      </ul>
    );
  }
  const Component = as;
  return <Component className={classes} style={gridStyle}>{items.map(({ child }) => child)}</Component>;
}
