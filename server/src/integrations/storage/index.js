import { config } from '../../config/index.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { S3StorageProvider } from './S3StorageProvider.js';
import { logger } from '../../lib/logger.js';

let instance = null;

/** Factory — the rest of the app calls getStorage(), never a concrete class. */
export function getStorage() {
  if (instance) return instance;
  if (config.storage.driver === 's3') {
    instance = new S3StorageProvider(config.storage.s3);
    logger.info(`Storage driver: s3 (bucket=${config.storage.s3.bucket})`);
  } else {
    instance = new LocalStorageProvider({
      uploadDir: config.storage.uploadDir,
      publicBaseUrl: config.storage.publicBaseUrl,
    });
    logger.info(`Storage driver: local (${config.storage.uploadDir})`);
  }
  return instance;
}

export default getStorage;
