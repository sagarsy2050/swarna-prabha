/**
 * Payment abstraction. The default `manual` provider records real Payment rows
 * and NEVER auto-marks them succeeded — a jeweller/admin confirms receipt. This
 * keeps the flow honest (no fake "payment successful" responses). A Stripe
 * adapter can implement this same contract later.
 *
 * @typedef {Object} PaymentIntentResult
 * @property {string} status      'requires_action' | 'succeeded' | 'failed'
 * @property {string} [providerRef]
 * @property {string} [instructions]  human-facing next step (manual provider)
 * @property {string} [clientSecret] for client-side confirmation (card providers)
 */
export class PaymentProvider {
  get name() {
    return 'abstract';
  }

  /** @returns {Promise<PaymentIntentResult>} */
  // eslint-disable-next-line no-unused-vars
  async createIntent({ orderId, amount, currency, customer }) {
    throw new Error('PaymentProvider.createIntent() not implemented');
  }

  /**
   * Confirm/settle a payment. For `manual` this is an authorised human action.
   * @returns {Promise<{ status: 'succeeded'|'failed', providerRef?: string }>}
   */
  // eslint-disable-next-line no-unused-vars
  async confirm({ paymentId, providerRef, actor }) {
    throw new Error('PaymentProvider.confirm() not implemented');
  }

  /** @returns {Promise<{ status: 'refunded'|'failed' }>} */
  // eslint-disable-next-line no-unused-vars
  async refund({ paymentId, amount }) {
    throw new Error('PaymentProvider.refund() not implemented');
  }
}

export default PaymentProvider;
