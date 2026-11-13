import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import { useDismissable } from "../../hooks/useDismissable";
import "./DropdownMenu.css";

/**
 * Menu button. `items`: [{ label, to?, href?, onSelect?, icon?, danger?, divider? }].
 * `to` renders a react-router Link, `href` an <a>, otherwise a <button>.
 * `{ divider: true }` renders a separator. `header` is optional non-interactive
 * content shown at the top of the panel (e.g. the signed-in user).
 */
export function DropdownMenu({
  label,
  triggerClassName = "",
  triggerLabel,
  align = "start",
  items = [],
  menuLabel,
  header,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const initialFocusRef = useRef("first");
  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const menuId = `${baseId}-menu`;

  const getItems = () =>
    panelRef.current ? Array.from(panelRef.current.querySelectorAll('[role="menuitem"]:not(:disabled):not([aria-disabled="true"])')) : [];

  const focusItem = (index) => {
    const els = getItems();
    if (!els.length) return;
    els[(index + els.length) % els.length].focus();
  };

  const close = ({ refocus = false } = {}) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useDismissable(wrapperRef, open, (reason) => close({ refocus: reason === "escape" }));

  useEffect(() => {
    if (!open) return;
    const els = getItems();
    if (!els.length) return;
    (initialFocusRef.current === "last" ? els[els.length - 1] : els[0]).focus();
  }, [open]);

  const openMenu = (focus = "first") => {
    initialFocusRef.current = focus;
    setOpen(true);
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (open) focusItem(0);
      else openMenu("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (open) focusItem(-1);
      else openMenu("last");
    }
  };

  const handleMenuKeyDown = (event) => {
    const els = getItems();
    const current = els.indexOf(document.activeElement);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(current < 0 ? -1 : current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(-1);
        break;
      case "Tab":
        // Close synchronously and park focus on the trigger so the browser's
        // default Tab moves on from there (forwards or backwards).
        flushSync(() => setOpen(false));
        triggerRef.current?.focus();
        break;
      default:
        break;
    }
  };

  const handleSelect = (item, event) => {
    item.onSelect?.(event);
    close({ refocus: !item.to && !item.href });
  };

  return (
    <div ref={wrapperRef} className={`ui-menu ui-menu--${align} ${className}`.trim()}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className={`ui-menu__trigger ${triggerClassName}`.trim()}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        onClick={() => (open ? close() : openMenu("first"))}
        onKeyDown={handleTriggerKeyDown}
      >
        {label}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          className="ui-menu__panel"
          role="menu"
          aria-label={menuLabel}
          aria-labelledby={menuLabel ? undefined : triggerId}
          onKeyDown={handleMenuKeyDown}
        >
          {header && <div className="ui-menu__header" role="presentation">{header}</div>}
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={`divider-${index}`} className="ui-menu__divider" role="separator" />;
            }
            const itemClass = `ui-menu__item${item.danger ? " ui-menu__item--danger" : ""}`;
            const content = (
              <>
                {item.icon && <span className="ui-menu__icon" aria-hidden="true">{item.icon}</span>}
                <span className="ui-menu__label">{item.label}</span>
              </>
            );
            const common = {
              role: "menuitem",
              tabIndex: -1,
              className: itemClass,
              onClick: (event) => handleSelect(item, event),
            };
            if (item.to) return <Link key={index} to={item.to} {...common}>{content}</Link>;
            if (item.href) return <a key={index} href={item.href} {...common}>{content}</a>;
            return (
              <button key={index} type="button" disabled={item.disabled} {...common}>
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
