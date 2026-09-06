import "./SailEntryScene.css";

// Visual slots can later receive components that render GLB models. No model
// loader or asset requests are needed for this lightweight SVG version.
export default function SailEntryScene({ products = [], boatVisual, treasureVisual }) {
  return (
    <div className="sail-scene" aria-hidden="true">
      <svg className="sail-water" viewBox="0 0 1000 360" fill="none" preserveAspectRatio="none">
        <path d="M500 0 30 360M500 0 970 360" stroke="#b5b4a6" strokeWidth="1" strokeDasharray="5 14" />
        <path d="M0 120Q125 100 250 120T500 120T750 120T1000 120M0 210Q125 185 250 210T500 210T750 210T1000 210M0 320Q125 290 250 320T500 320T750 320T1000 320" stroke="#a7b7a0" strokeWidth="2" />
      </svg>
      <div className="sail-destination">
        <div className="sail-treasure">
          {treasureVisual || <svg viewBox="0 0 140 110" fill="none">
            <path d="M20 50V36Q20 15 42 15H98Q120 15 120 36V50" fill="#dce9c7" stroke="#1c2a39" strokeWidth="3" />
            <path d="M15 49H125L118 94H22Z" fill="#fff3df" stroke="#1c2a39" strokeWidth="3" strokeLinejoin="round" />
            <path d="M42 17V93M98 17V93" stroke="#b52c26" strokeWidth="9" />
            <path d="M15 51H125" stroke="#1c2a39" strokeWidth="3" />
            <rect x="60" y="44" width="20" height="22" rx="2" fill="#ef403a" stroke="#1c2a39" strokeWidth="2" />
            <path d="M70 50V59" stroke="#1c2a39" strokeWidth="3" />
          </svg>}
        </div>
        <span>LOCAL FINDS</span>
      </div>
      <div className="sail-boat">
        {boatVisual || <svg viewBox="0 0 180 180" fill="none">
          <path d="M90 15V140" stroke="#1c2a39" strokeWidth="4" strokeLinecap="round" />
          <path d="M83 27 25 119H83Z" fill="#ef403a" stroke="#1c2a39" strokeWidth="3" strokeLinejoin="round" />
          <path d="M99 50 142 118H99Z" fill="#fff3df" stroke="#1c2a39" strokeWidth="3" strokeLinejoin="round" />
          <path d="M18 136H160L137 159H42Z" fill="#1c2a39" />
          <path d="M46 171Q67 161 89 171T133 171" stroke="#a7b7a0" strokeWidth="3" strokeLinecap="round" />
        </svg>}
      </div>
      {products.slice(0, 3).map((product, index) => (
        <div className={`sail-find sail-find-${index}`} key={product.id}>
          {product.image_urls?.[0] && <img src={product.image_urls[0]} alt="" decoding="async" />}
          <strong>{product.title}</strong><span>${Number(product.price).toFixed(2)}</span>
        </div>
      ))}
      <span className="sail-marker sail-marker-left">⌖</span>
      <span className="sail-marker sail-marker-right">⌖</span>
      <span className="sail-compass">N<br />↑</span>
    </div>
  );
}
