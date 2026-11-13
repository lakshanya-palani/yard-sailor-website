import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import "./ImageGallery.css";

/**
 * Listing photo viewer: main image (fixed 4:3 frame) with prev/next overlays,
 * thumbnail buttons and Left/Right/Home/End keys while focus is inside.
 * `images` is an array of URLs; `alt` names the listing ("<alt> — image 2 of 5").
 */
export function ImageGallery({ images, alt = "Listing", label = "Images", className }) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const key = list.join("|");
  // Reset to the first image whenever the image set changes.
  const [selection, setSelection] = useState({ key, index: 0 });
  const index = selection.key === key ? Math.min(selection.index, Math.max(list.length - 1, 0)) : 0;
  const thumbsRef = useRef(null);
  const count = list.length;
  const multiple = count > 1;

  function select(next, { focusThumb = false } = {}) {
    const wrapped = (next + count) % count;
    setSelection({ key, index: wrapped });
    if (focusThumb) thumbsRef.current?.querySelectorAll("button")[wrapped]?.focus();
  }

  function handleKeyDown(event) {
    if (!multiple) return;
    const fromThumb = Boolean(event.target.closest?.(".listing-gallery__thumbs"));
    const moves = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: count - 1 };
    if (!(event.key in moves)) return;
    if ((event.key === "Home" || event.key === "End") && !fromThumb) return;
    event.preventDefault();
    select(moves[event.key], { focusThumb: fromThumb });
  }

  const classes = ["listing-gallery", className].filter(Boolean).join(" ");

  if (!count) {
    return (
      <section className={classes} aria-label={label}>
        <div className="listing-gallery__frame listing-gallery__frame--empty">
          <ImageOff size={36} aria-hidden="true" />
          <span>No image available</span>
        </div>
      </section>
    );
  }

  return (
    <section
      className={classes}
      aria-label={label}
      aria-roledescription={multiple ? "carousel" : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className="listing-gallery__frame">
        <img
          className="listing-gallery__image"
          src={list[index]}
          alt={multiple ? `${alt} — image ${index + 1} of ${count}` : alt}
          decoding="async"
        />
        {multiple && (
          <>
            <IconButton variant="overlay" className="listing-gallery__nav listing-gallery__nav--prev" label="Previous image" onClick={() => select(index - 1)}>
              <ChevronLeft />
            </IconButton>
            <IconButton variant="overlay" className="listing-gallery__nav listing-gallery__nav--next" label="Next image" onClick={() => select(index + 1)}>
              <ChevronRight />
            </IconButton>
            <span className="listing-gallery__count" aria-hidden="true">{index + 1} / {count}</span>
          </>
        )}
      </div>
      {multiple && (
        <>
          <p className="sr-only" aria-live="polite">Image {index + 1} of {count}</p>
          <ul className="listing-gallery__thumbs" ref={thumbsRef}>
            {list.map((image, i) => (
              <li key={`${image}-${i}`}>
                <button
                  type="button"
                  className={`listing-gallery__thumb${i === index ? " is-current" : ""}`}
                  aria-label={`Show image ${i + 1} of ${count}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => select(i)}
                >
                  <img src={image} alt="" loading="lazy" decoding="async" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
