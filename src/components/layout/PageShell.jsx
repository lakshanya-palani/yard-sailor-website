import './PageShell.css';

const WIDTHS = new Set(['narrow', 'default', 'wide', 'full']);

/**
 * Page frame: cream background, standard padding and a centred container.
 * Renders the page's <main> landmark (RouteAccessibility's skip link targets it),
 * so pages using PageShell must not wrap it in another <main>. Pass as="div" to nest it.
 */
export function PageShell({ width = 'default', as: Tag = 'main', className, children }) {
  const size = WIDTHS.has(width) ? width : 'default';
  return (
    <Tag className={['ui-page-shell', className].filter(Boolean).join(' ')}>
      <div className={`ui-page-shell__inner ui-page-shell__inner--${size}`}>{children}</div>
    </Tag>
  );
}
