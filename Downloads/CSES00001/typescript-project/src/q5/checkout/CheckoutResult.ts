import { Money }          from '../domain/Money';
import { PaymentLegSpec } from '../domain/PaymentLeg';
import { ChargeResult }   from '../providers/IPaymentProvider';
import { CompensationRecord } from './SagaLog';

// ── Success result ────────────────────────────────────────────────────────────

export interface CheckoutSuccessResult {
  readonly orderId:      string;
  /** Maps `providerId → chargeId` returned by each provider. */
  readonly chargeIds:    Readonly<Record<string, string>>;
  readonly totalCharged: Money;
}

// ── Exceptions ────────────────────────────────────────────────────────────────

/**
 * Thrown when a payment leg fails. Contains:
 * - Which leg failed and why (`chargeResult`).
 * - Rollback results for every previously-successful leg (`compensationRecords`).
 */
export class CheckoutFailedException extends Error {
  constructor(
    public readonly failedLeg:           PaymentLegSpec,
    public readonly chargeResult:         ChargeResult,
    public readonly compensationRecords:  ReadonlyArray<CompensationRecord>,
  ) {
    super(
      `Checkout failed on provider '${failedLeg.providerId}': ` +
      (chargeResult.errorMessage ?? chargeResult.errorCode ?? chargeResult.status),
    );
    this.name = 'CheckoutFailedException';
  }
}

/** Thrown before any charge is attempted when the order is structurally invalid. */
export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutValidationError';
  }
}
