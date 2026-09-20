import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
export default function RouteAccessibility() {
  const { pathname } = useLocation();
  useEffect(() => {
    const main = document.querySelector('main');
    if (main) { main.id = 'main-content'; main.tabIndex = -1; }
  }, [pathname]);
  return <a className="skip-link" href="#main-content" onClick={() => {
    const main = document.querySelector('main');
    if (main) { main.id = 'main-content'; main.tabIndex = -1; main.focus(); }
  }}>Skip to content</a>;
}
