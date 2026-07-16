import { Money } from '../domain/Money';

// ── Capability flags ──────────────────────────────────────────────────────────

export interface ProviderCapabilities {
  /** Provider can refund to the original payment method (customer-facing). */
  readonly supportsRefunds: boolean;
  /** Provider supports partial capture after an authorization hold. */
  readonly supportsPartialCapture: boolean;
  /**
   * Provider can process external card details.
   * `false` for StoreCredit — it can only deduct an in-house wallet balance,
   * never charge a card.
   */
  readonly supportsExternalCard: boolean;
  /**
   * When `true` (e.g. Stripe), replaying a charge with the same idempotency-
   * key is safe; the provider deduplicates the request server-side.
   *
   * When `false` (e.g. PayPal), an UNKNOWN_OUTCOME (network timeout) must
   * NOT be retried with the same key — the outcome is genuinely unknown and
   * a blind retry could cause a double-charge.
   */
  readonly isIdempotent: boolean;
}

// ── Charge ────────────────────────────────────────────────────────────────────

export interface ChargeRequest {
  readonly orderId:        string;
  readonly customerId:     string;
  readonly amount:         Money;
  /**
   * Unique key for this attempt. The retry layer is responsible for setting
   * this field — orchestrators pass `Omit<ChargeRequest, 'idempotencyKey'>`.
   */
  readonly idempotencyKey: string;
  readonly metadata?:      Readonly<Record<string, unknown>>;
}

export type ChargeResultStatus =
  | 'SUCCESS'
  | 'TRANSIENT_FAILURE'    // safe to retry (rate-limit, 503, …)
  | 'PERMANENT_FAILURE'    // hard decline — never retry
  | 'UNKNOWN_OUTCOME';     // timed-out; charge may or may not have landed

export interface ChargeResult {
  readonly status:        ChargeResultStatus;
  readonly chargeId?:     string;
  readonly errorCode?:    string;
  readonly errorMessage?: string;
}

// ── Refund (customer-facing) ──────────────────────────────────────────────────

export interface RefundResult {
  readonly status:        'SUCCESS' | 'FAILED';
  readonly refundId?:     string;
  readonly errorMessage?: string;
}

// ── Partial capture ──────────────────────────────────────────────────────────

export interface CaptureResult {
  readonly status:        'SUCCESS' | 'FAILED';
  readonly captureId?:    string;
  readonly errorMessage?: string;
}

// ── Saga compensation ────────────────────────────────────────────────────────

/**
 * Returned by `IPaymentProvider.compensate()`.
 *
 * Distinct from `RefundResult` (customer-facing) — compensation is an
 * internal saga rollback mechanic, not a user-initiated refund flow.
 */
export interface CompensationResult {
  readonly status:  'SUCCESS' | 'FAILED' | 'MANUAL_REQUIRED';
  readonly reason?: string;
}

// ── Provider interface ────────────────────────────────────────────────────────

/**
 * Every payment backend must implement this interface.
 *
 * Finance team: add a new provider by implementing this interface and calling
 * `ProviderRegistry.register(new MyProvider(...))` in the bootstrap config.
 * No payments-team code review of the core is needed.
 */
export interface IPaymentProvider {
  readonly id:           string;
  readonly capabilities: ProviderCapabilities;

  /** Primary charge call. */
  charge(request: ChargeRequest): Promise<ChargeResult>;

  /**
   * Saga compensation — mandatory on every provider.
   *
   * Called by the orchestrator to undo a successful charge when a later leg
   * in the same transaction fails.
   *
   * Stripe/PayPal → delegates to their external refund API.
   * StoreCredit   → credits the in-house wallet balance back.
   */
  compensate(
    chargeId:   string,
    customerId: string,
    amount:     Money,
  ): Promise<CompensationResult>;

  /** Customer-facing refund (optional — controlled by `supportsRefunds`). */
  refund?(chargeId: string, amount?: Money): Promise<RefundResult>;

  /** Partial capture after an authorization (optional). */
  partialCapture?(chargeId: string, amount: Money): Promise<CaptureResult>;
}
