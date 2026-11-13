import "./MetaList.css";

/** Label/value facts as a <dl>. Items with an empty value are skipped. */
export function MetaList({ items, className }) {
  const rows = (items || []).filter(item => item && item.value != null && item.value !== "");
  if (!rows.length) return null;
  return (
    <dl className={["listing-meta", className].filter(Boolean).join(" ")}>
      {rows.map(({ label, value }) => (
        <div className="listing-meta__row" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
