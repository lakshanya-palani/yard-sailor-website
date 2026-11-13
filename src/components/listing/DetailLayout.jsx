import "./DetailLayout.css";

/** Two-column listing detail: media on the left, info panel on the right; stacked below 900px. */
export function DetailLayout({ media, children, className }) {
  return (
    <div className={["listing-detail", className].filter(Boolean).join(" ")}>
      <div className="listing-detail__media">{media}</div>
      <div className="listing-detail__panel">{children}</div>
    </div>
  );
}
