import {
  IPaymentProvider,
  ProviderCapabilities,
  ChargeRequest,
  ChargeResult,
  RefundResult,
  CaptureResult,
  CompensationResult,
} from './IPaymentProvider';
import { Money } from '../domain/Money';

/**
 * HTTP abstraction over Stripe's API.
 *
 * In production: inject a thin wrapper around the Stripe SDK / fetch.
 * In tests: inject a `FakeStripeHttpClient` — zero network calls.
 */
export interface StripeHttpClient {
  createCharge(request: ChargeRequest): Promise<ChargeResult>;
  createRefund(chargeId: string, amount?: Money): Promise<RefundResult>;
  captureCharge(chargeId: string, amount: Money): Promise<CaptureResult>;
}

/**
 * Stripe payment provider.
 *
 * Capabilities:
 *   ✅ supportsRefunds        — full and partial refunds via Stripe API
 *   ✅ supportsPartialCapture — capture less than the authorized amount
 *   ✅ supportsExternalCard   — primary card-charging provider
 *   ✅ isIdempotent           — Stripe deduplicates on idempotency-key header
 */
export class StripeProvider implements IPaymentProvider {
  readonly id = 'stripe';

  readonly capabilities: ProviderCapabilities = {
    supportsRefunds:        true,
    supportsPartialCapture: true,
    supportsExternalCard:   true,
    isIdempotent:           true,
  };

  constructor(private readonly http: StripeHttpClient) {}

  charge(request: ChargeRequest): Promise<ChargeResult> {
    return this.http.createCharge(request);
  }

  async refund(chargeId: string, amount?: Money): Promise<RefundResult> {
    return this.http.createRefund(chargeId, amount);
  }

  async partialCapture(chargeId: string, amount: Money): Promise<CaptureResult> {
    return this.http.captureCharge(chargeId, amount);
  }

  async compensate(
    chargeId:    string,
    _customerId: string,
    amount:      Money,
  ): Promise<CompensationResult> {
    const result = await this.http.createRefund(chargeId, amount);
    return result.status === 'SUCCESS'
      ? { status: 'SUCCESS' }
      : { status: 'FAILED', reason: result.errorMessage };
  }
}
