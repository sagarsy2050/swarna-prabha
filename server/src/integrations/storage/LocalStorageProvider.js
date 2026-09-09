import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { StorageProvider } from './StorageProvider.js';

/** Writes bytes under UPLOAD_DIR; files are served by the app at PUBLIC_UPLOAD_BASE_URL. */
export class LocalStorageProvider extends StorageProvider {
  constructor({ uploadDir, publicBaseUrl }) {
    super();
    this.root = path.resolve(uploadDir);
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, '');
  }

  #keyFor(filename, purpose) {
    const ext = path.extname(filename || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
    const id = crypto.randomBytes(16).toString('hex');
    const prefix = (purpose || 'misc').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'misc';
    return `${prefix}/${id}${ext}`;
  }

  async save({ buffer, filename, mime, purpose }) {
    const key = this.#keyFor(filename, purpose);
    const dest = path.join(this.root, key);
    // Contain writes to root even if key were ever manipulated.
    if (!dest.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, buffer);
    return { key, url: this.getUrl(key), mime, size: buffer.length };
  }

  getUrl(key) {
    return `${this.publicBaseUrl}/${key}`;
  }

  async delete(key) {
    const dest = path.join(this.root, key);
    if (!dest.startsWith(this.root + path.sep)) return;
    await fs.rm(dest, { force: true });
  }

  async read(key) {
    const dest = path.join(this.root, key);
    if (!dest.startsWith(this.root + path.sep)) throw new Error('Invalid storage key');
    return fs.readFile(dest);
  }

  async readByUrl(url) {
    if (typeof url !== 'string' || !url.startsWith(`${this.publicBaseUrl}/`)) return null;
    const key = url.slice(this.publicBaseUrl.length + 1).split('?')[0];
    try {
      return await this.read(decodeURIComponent(key));
    } catch {
      return null;
    }
  }
}

export default LocalStorageProvider;
