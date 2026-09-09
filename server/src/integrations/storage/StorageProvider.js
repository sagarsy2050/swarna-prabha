/**
 * Storage abstraction. Application code depends only on this contract, never on
 * a concrete provider, so swapping local disk ↔ S3/R2/B2/MinIO is one env var.
 *
 * @typedef {Object} StoredFile
 * @property {string} key       Provider-relative key (also the DB primary handle)
 * @property {string} url       Publicly resolvable URL
 * @property {string} [mime]
 * @property {number} [size]
 */
export class StorageProvider {
  /** @returns {Promise<StoredFile>} */
  // eslint-disable-next-line no-unused-vars
  async save({ buffer, filename, mime, purpose }) {
    throw new Error('StorageProvider.save() not implemented');
  }

  /** @returns {string} */
  // eslint-disable-next-line no-unused-vars
  getUrl(key) {
    throw new Error('StorageProvider.getUrl() not implemented');
  }

  /** @returns {Promise<void>} */
  // eslint-disable-next-line no-unused-vars
  async delete(key) {
    throw new Error('StorageProvider.delete() not implemented');
  }

  /** Read an object's bytes back. @returns {Promise<Buffer>} */
  // eslint-disable-next-line no-unused-vars
  async read(key) {
    throw new Error('StorageProvider.read() not implemented');
  }

  /**
   * Resolve a public URL this provider issued back to its bytes, without an HTTP
   * round-trip where possible. Returns null if the URL is not ours.
   * @returns {Promise<Buffer|null>}
   */
  // eslint-disable-next-line no-unused-vars
  async readByUrl(url) {
    return null;
  }
}

export default StorageProvider;
