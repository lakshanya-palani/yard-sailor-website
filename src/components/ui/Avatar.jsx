import { useState } from 'react';
import './Avatar.css';

export function Avatar({ src, name, size = 32, className, alt }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const letter = (name?.trim()?.[0] || '?').toUpperCase();
  const showImage = Boolean(src) && failedSrc !== src;
  const classes = ['ui-avatar', className].filter(Boolean).join(' ');
  const style = { width: size, height: size, fontSize: Math.round(size * 0.45) };

  return (
    <span className={classes} style={style}>
      {showImage ? (
        <img
          className="ui-avatar__img"
          src={src}
          alt={alt ?? name ?? ''}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span className="ui-avatar__letter" aria-hidden={name ? undefined : true}>{letter}</span>
      )}
    </span>
  );
}
