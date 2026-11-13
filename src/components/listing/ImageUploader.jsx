import { ImagePlus, X } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import "./ImageUploader.css";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Photo grid for listing forms. Presentation only: the page owns the image list,
 * validation (validImages) and uploads.
 * `images`: [{ key, src }] in upload order — the first one is the cover.
 * `onSelect` receives the file input's change event; `onRemove` receives the index.
 */
export function ImageUploader({ images, max = 8, onSelect, onRemove, disabled = false, label = "Add photo" }) {
  const remaining = max - images.length;
  return (
    <div className="listing-uploader">
      <ul className="listing-uploader__grid" aria-label={`Photos, ${images.length} of ${max}`}>
        {images.map((image, index) => (
          <li className="listing-uploader__item image-preview" key={image.key}>
            <img src={image.src} alt={`Photo ${index + 1}${index === 0 ? " (cover)" : ""}`} />
            {index === 0 && <span className="listing-uploader__cover" aria-hidden="true">Cover</span>}
            <IconButton
              className="listing-uploader__remove"
              variant="overlay"
              size="sm"
              label={`Remove photo ${index + 1}`}
              onClick={() => onRemove(index)}
              disabled={disabled}
            >
              <X />
            </IconButton>
          </li>
        ))}
        {remaining > 0 && (
          <li className="listing-uploader__item">
            <label className={["listing-uploader__add", disabled && "is-disabled"].filter(Boolean).join(" ")}>
              <ImagePlus size={28} aria-hidden="true" />
              <span className="listing-uploader__add-label">{label}</span>
              <span className="listing-uploader__add-hint">{remaining} left</span>
              <input
                className="listing-uploader__input"
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                onChange={onSelect}
                disabled={disabled}
              />
            </label>
          </li>
        )}
      </ul>
    </div>
  );
}
