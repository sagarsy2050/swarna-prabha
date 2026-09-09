import crypto from 'node:crypto';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { StorageProvider } from './StorageProvider.js';

/**
 * Works with any S3-compatible store: AWS S3, Cloudflare R2, Backblaze B2, MinIO.
 * For non-AWS, set S3_ENDPOINT and usually S3_FORCE_PATH_STYLE=true.
 * Public URL: S3_PUBLIC_BASE_URL if set (CDN / bucket website), else endpoint-derived.
 */
export class S3StorageProvider extends StorageProvider {
  constructor(cfg) {
    super();
    if (!cfg.bucket || !cfg.accessKeyId || !cfg.secretAccessKey) {
      throw new Error('S3 storage requires S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY');
    }
    this.bucket = cfg.bucket;
    this.publicBase = (cfg.publicBaseUrl || '').replace(/\/$/, '');
    this.endpoint = cfg.endpoint;
    this.client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint || undefined,
      forcePathStyle: !!cfg.forcePathStyle,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }

  #keyFor(filename, purpose) {
    const ext = path.extname(filename || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
    const id = crypto.randomBytes(16).toString('hex');
    const prefix = (purpose || 'misc').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'misc';
    return `${prefix}/${id}${ext}`;
  }

  async save({ buffer, filename, mime, purpose }) {
    const key = this.#keyFor(filename, purpose);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mime || 'application/octet-stream',
      }),
    );
    return { key, url: this.getUrl(key), mime, size: buffer.length };
  }

  getUrl(key) {
    if (this.publicBase) return `${this.publicBase}/${key}`;
    if (this.endpoint) return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async delete(key) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async read(key) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await res.Body.transformToByteArray());
  }

  async readByUrl(url) {
    for (const base of [this.publicBase, this.endpoint ? `${this.endpoint.replace(/\/$/, '')}/${this.bucket}` : '']) {
      if (base && typeof url === 'string' && url.startsWith(`${base}/`)) {
        try {
          return await this.read(decodeURIComponent(url.slice(base.length + 1).split('?')[0]));
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

export default S3StorageProvider;
