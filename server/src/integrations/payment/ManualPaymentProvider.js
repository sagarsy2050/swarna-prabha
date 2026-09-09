import crypto from 'node:crypto';
import { PaymentProvider } from './PaymentProvider.js';

/**
 * Offline / bank-transfer / in-person settlement. `createIntent` produces a
 * reference and instructions; the payment stays `pending` until an authorised
 * jeweller or admin calls `confirm`. No automatic success.
 */
export class ManualPaymentProvider extends PaymentProvider {
  get name() {
    return 'manual';
  }

  async createIntent({ orderId, amount, currency }) {
    const providerRef = `MAN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    return {
      status: 'requires_action',
      providerRef,
      instructions:
        `Payment reference ${providerRef}. Settle ${amount} ${currency} for order ${orderId} ` +
        `by bank transfer or in person. A jeweller confirms receipt to advance the order.`,
    };
  }

  async confirm({ providerRef, actor }) {
    if (!actor || !['JEWELLER', 'ADMIN'].includes(actor.role)) {
      return { status: 'failed' };
    }
    return { status: 'succeeded', providerRef: providerRef || undefined };
  }

  async refund() {
    return { status: 'refunded' };
  }
}

export default ManualPaymentProvider;
