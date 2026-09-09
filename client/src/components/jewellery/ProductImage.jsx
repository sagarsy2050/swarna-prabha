import React, { useState } from 'react';
import { cn, assetUrl } from '@/lib/utils';

/**
 * A product photo, resolved from its category's classification folder.
 *
 * Treatment matches the reference app: a neutral tile (`bg-neutral-100`) with the
 * photo shown `object-cover`. The curated images are square with a white ground,
 * so an `aspect-square` tile shows them without cropping.
 *
 * A missing/broken image shows a neutral "Image unavailable" box — never a
 * substitute image from another product or category.
 */
export default function ProductImage({ image, alt, className, ratio = 'aspect-square', fit = 'cover' }) {
  const [failed, setFailed] = useState(false);
  const src = image?.url ? assetUrl(image.url) : null;

  if (!src || failed) {
    return (
      <div
        className={cn(
          ratio,
          'w-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs tracking-wide',
          className,
        )}
      >
        Image unavailable
      </div>
    );
  }

  return (
    <div className={cn(ratio, 'w-full overflow-hidden bg-neutral-100', className)}>
      <img
        src={src}
        alt={alt || image?.alt || ''}
        loading="lazy"
        decoding="async"
        className={cn('w-full h-full', fit === 'contain' ? 'object-contain' : 'object-cover')}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
