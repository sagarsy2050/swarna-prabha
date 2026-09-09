import * as React from 'react';
import { cn } from '@/lib/utils';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="#f1f1f1"/><text x="50%" y="50%" fill="#bbb" font-family="sans-serif" font-size="20" text-anchor="middle" dominant-baseline="middle">no image</text></svg>`,
  );

/**
 * Plain resilient image. The former Base44/Wix media-transform pipeline was
 * removed with the SDK; unknown URLs now render as a normal <img>, and a broken
 * URL swaps to an inline placeholder. Prop surface (`src`, `alt`, `className`,
 * `fittingType`) is unchanged so migrated pages needed no edits.
 */
const Image = React.forwardRef(({ src, alt = '', className, fittingType = 'fill', onError, ...props }, ref) => {
  const [failed, setFailed] = React.useState(false);
  return (
    <img
      ref={ref}
      src={failed || !src ? FALLBACK : src}
      alt={alt}
      loading="lazy"
      className={cn(fittingType === 'fit' ? 'object-contain' : 'object-cover', className)}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      {...props}
    />
  );
});
Image.displayName = 'Image';

export { Image };
