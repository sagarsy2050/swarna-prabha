import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { serialize } from '../utils/serialize.js';
import { getStorage } from '../integrations/storage/index.js';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Replaces Base44 `Core.UploadFile`. Bytes go to the storage provider (local
 * disk or S3); only a lightweight FileObject row (key + URL + metadata) is
 * persisted — files are never stored in the database.
 */
export const fileService = {
  async upload({ buffer, originalname, mimetype, purpose }, ctx) {
    if (!buffer?.length) throw ApiError.badRequest('Empty file');
    if (!ALLOWED_MIME.has(mimetype)) {
      throw ApiError.badRequest(`Unsupported file type: ${mimetype}. Allowed: ${[...ALLOWED_MIME].join(', ')}`);
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new ApiError(413, 'File exceeds 8 MB limit', { code: 'FILE_TOO_LARGE' });
    }
    const stored = await getStorage().save({
      buffer,
      filename: originalname || 'upload',
      mime: mimetype,
      purpose: purpose || 'misc',
    });
    const record = await prisma.fileObject.create({
      data: {
        key: stored.key,
        provider: getStorage().constructor.name.replace('StorageProvider', '').toLowerCase() || 'local',
        url: stored.url,
        mime: mimetype,
        size: buffer.length,
        purpose: purpose || 'misc',
        ownerId: ctx.user?.id || null,
      },
    });
    // Base44-compatible field name (`file_url`) plus the canonical shape.
    return { ...serialize(record), file_url: record.url };
  },

  async remove(id, ctx) {
    const file = await prisma.fileObject.findUnique({ where: { id } });
    if (!file) throw ApiError.notFound('file not found');
    if (file.ownerId && file.ownerId !== ctx.user.id && ctx.user.role !== 'ADMIN') {
      throw ApiError.forbidden('Not your file');
    }
    await getStorage().delete(file.key);
    await prisma.fileObject.delete({ where: { id } });
    return { id };
  },
};

export default fileService;
