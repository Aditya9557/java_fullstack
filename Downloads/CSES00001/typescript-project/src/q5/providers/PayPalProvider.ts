import {
  IPaymentProvider,
  ProviderCapabilities,
  ChargeRequest,
  ChargeResult,
  RefundResult,
  CompensationResult,
} from './IPaymentProvider';
import { Money } from '../domain/Money';

/**
 * HTTP abstraction over PayPal's Orders/Payments API.
 *
 * In production: inject a wrapper around PayPal's REST SDK / fetch.
 * In tests: inject a fake — zero network calls.
 */
export interface PayPalHttpClient {
  createOrder(request: ChargeRequest): Promise<ChargeResult>;
  refundCapture(chargeId: string, amount?: Money): Promise<RefundResult>;
}

/**
 * PayPal payment provider.
 *
 * Capabilities:
 *   ✅ supportsRefunds          — refunds via PayPal Refund Capture API
 *   ❌ supportsPartialCapture   — PayPal captures the full authorized amount
 *   ✅ supportsExternalCard      — processes cards and PayPal balances
 *   ❌ isIdempotent              — PayPal does NOT deduplicate replayed requests;
 *                                  an UNKNOWN_OUTCOME must never be retried
 *                                  blindly (double-charge risk).
 */
export class PayPalProvider implements IPaymentProvider {
  readonly id = 'paypal';

  readonly capabilities: ProviderCapabilities = {
    supportsRefunds:        true,
    supportsPartialCapture: false,
    supportsExternalCard:   true,
    isIdempotent:           false,
  };

  constructor(private readonly http: PayPalHttpClient) {}

  charge(request: ChargeRequest): Promise<ChargeResult> {
    return this.http.createOrder(request);
  }

  async refund(chargeId: string, amount?: Money): Promise<RefundResult> {
    return this.http.refundCapture(chargeId, amount);
  }

  async compensate(
    chargeId:    string,
    _customerId: string,
    amount:      Money,
  ): Promise<CompensationResult> {
    const result = await this.http.refundCapture(chargeId, amount);
    return result.status === 'SUCCESS'
      ? { status: 'SUCCESS' }
      : { status: 'FAILED', reason: result.errorMessage };
  }
}
