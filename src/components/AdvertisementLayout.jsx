
import "./AdvertisementLayout.css";

function AdvertisementLayout({ children }) {
  return (
    <div className="advertisement-layout">

      {/* Left advertisement column */}
      <aside className="advertisement-sidebar advertisement-left" aria-label="Left advertisement space">
        <span className="advertisement-label">ADVERTISEMENT</span>
        <div className="advertisement-placeholder">
          <span>Advertisement Space</span>
          <small>Local businesses and promotions</small>
        </div>
      </aside>

      {/* Main page content */}
      <div className="advertisement-main">
        {children}
      </div>

      {/* Right advertisement column */}
      <aside className="advertisement-sidebar advertisement-right" aria-label="Right advertisement space">
        <span className="advertisement-label">ADVERTISEMENT</span>
        <div className="advertisement-placeholder">
          <span>Advertisement Space</span>
          <small>Sponsored listings and local deals</small>
        </div>
      </aside>

    </div>
  );
}

export default AdvertisementLayout;
