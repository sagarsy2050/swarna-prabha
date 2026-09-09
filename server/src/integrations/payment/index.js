import { ManualPaymentProvider } from './ManualPaymentProvider.js';
import { logger } from '../../lib/logger.js';

let instance = null;

/**
 * Payment provider. Swarna Prabha settles manually: an order is recorded with
 * a pending Payment row and a jeweller/admin confirms receipt. No external
 * gateway, no fabricated success.
 */
export function getPaymentProvider() {
  if (instance) return instance;
  instance = new ManualPaymentProvider();
  logger.info('Payment driver: manual (offline settlement, human confirmation)');
  return instance;
}

export default getPaymentProvider;
