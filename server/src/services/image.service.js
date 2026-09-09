import fs from 'node:fs';
import path from 'node:path';
import { ApiError } from '../utils/ApiError.js';

/**
 * Jewellery image integrity.
 *
 * `jewellery-images/<folder>/` (repo root) is the ONLY approved source of product
 * imagery. A product in a category may reference an image ONLY from that
 * category's folder. This module is the single place that fact is enforced —
 * every product create/update runs its image list through `assertImagesInFolder`.
 *
 * There is no fallback, no cross-folder lookup and no generated image. If a
 * folder is empty the catalogue simply has no products there.
 */

const ROOT = path.resolve(process.cwd(), '..', 'jewellery-images');
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

// folder -> Set<filename>, lazily built and cached for a short TTL so a jeweller
// dropping a new file in doesn't require a restart.
let cache = null;
let cachedAt = 0;
const TTL_MS = 30_000;

function safeSegment(name) {
  return typeof name === 'string' && /^[a-z0-9-]+$/.test(name);
}

function scan() {
  const out = new Map();
  let entries = [];
  try {
    entries = fs.readdirSync(ROOT, { withFileTypes: true });
  } catch {
    return out; // no jewellery-images/ dir yet — every folder is "empty"
  }
  for (const e of entries) {
    if (!e.isDirectory() || !safeSegment(e.name)) continue;
    let files = [];
    try {
      files = fs
        .readdirSync(path.join(ROOT, e.name), { withFileTypes: true })
        .filter((f) => f.isFile() && IMAGE_RE.test(f.name))
        .map((f) => f.name);
    } catch {
      files = [];
    }
    out.set(e.name, new Set(files));
  }
  return out;
}

function index() {
  const now = Date.now();
  if (!cache || now - cachedAt > TTL_MS) {
    cache = scan();
    cachedAt = now;
  }
  return cache;
}

export const imageService = {
  rootDir: ROOT,

  /** Force a re-scan on the next read (used after an upload lands a new file). */
  invalidate() {
    cache = null;
  },

  /** All classification folders that currently exist on disk. */
  folders() {
    return [...index().keys()].sort();
  },

  /** Filenames available in one folder (empty array if the folder has none). */
  listFolder(folder) {
    if (!safeSegment(folder)) return [];
    return [...(index().get(folder) || [])].sort();
  },

  /** True when `filename` is a real image inside `folder`. */
  exists(folder, filename) {
    return !!(safeSegment(folder) && index().get(folder)?.has(filename));
  },

  /**
   * Validate a product's image inputs against its category folder and return the
   * rows to persist. Throws `ApiError.unprocessable` on any mismatch.
   *
   * @param {string} folder            the category's `folder`
   * @param {Array<{path,alt?,isPrimary?,sortOrder?}>} images
   */
  buildProductImages(folder, images = []) {
    if (!safeSegment(folder)) {
      throw ApiError.unprocessable(`Category folder "${folder}" is not a valid classification folder`, {
        code: 'INVALID_CATEGORY_FOLDER',
      });
    }
    const available = index().get(folder);
    if (!available || available.size === 0) {
      throw ApiError.unprocessable(
        `No jewellery images exist in the "${folder}" classification folder`,
        { code: 'CATEGORY_FOLDER_EMPTY' },
      );
    }
    const seen = new Set();
    const rows = images.map((img, i) => {
      const file = path.basename(String(img.path || '').trim());
      if (file !== img.path?.trim()) {
        throw ApiError.unprocessable(`Image path "${img.path}" must be a bare filename`, {
          code: 'IMAGE_PATH_INVALID',
        });
      }
      if (!available.has(file)) {
        throw ApiError.unprocessable(
          `Image "${file}" is not in the "${folder}" folder — an image must belong to its product's category`,
          { code: 'IMAGE_CATEGORY_MISMATCH' },
        );
      }
      if (seen.has(file)) {
        throw ApiError.unprocessable(`Image "${file}" is listed twice`, { code: 'IMAGE_DUPLICATE' });
      }
      seen.add(file);
      return {
        folder,
        path: file,
        alt: img.alt || null,
        sortOrder: Number.isInteger(img.sortOrder) ? img.sortOrder : i,
        isPrimary: !!img.isPrimary,
      };
    });
    if (rows.length && !rows.some((r) => r.isPrimary)) rows[0].isPrimary = true;
    return rows;
  },
};

export default imageService;
