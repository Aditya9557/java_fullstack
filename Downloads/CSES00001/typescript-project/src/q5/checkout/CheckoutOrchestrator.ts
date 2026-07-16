import { Order }              from '../domain/Order';
import { Money }              from '../domain/Money';
import { ProviderRegistry }   from '../providers/ProviderRegistry';
import { ChargeRequest }      from '../providers/IPaymentProvider';
import { FraudPipeline }      from '../fraud/FraudPipeline';
import { FraudContext }       from '../fraud/IFraudCheck';
import { ChargeWithRetry }    from '../retry/ChargeWithRetry';
import { SagaLog }            from './SagaLog';
import {
  CheckoutSuccessResult,
  CheckoutFailedException,
  CheckoutValidationError,
} from './CheckoutResult';
import { Logger } from '../Logger';

/**
 * Orchestrates a multi-leg checkout transaction using the **Saga pattern**.
 *
 * Flow:
 *  1. Validate that leg amounts sum to the order total.
 *  2. Run the region-specific fraud pipeline (throws if denied — no charge).
 *  3. Charge each leg sequentially via the provider registry + retry layer.
 *  4. On any leg failure → compensate all previously-charged legs in reverse
 *     order, then throw `CheckoutFailedException`.
 *  5. On full success → return `CheckoutSuccessResult`.
 *
 * **Ownership model:**
 * - Payments team owns this file.
 * - Compliance team adds fraud rules via `RegionCheckRegistry` (no change here).
 * - Finance team adds providers via `ProviderRegistry` (no change here).
 */
export class CheckoutOrchestrator {
  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly fraudPipeline:    FraudPipeline,
    private readonly chargeWithRetry:  ChargeWithRetry,
    private readonly logger:           Logger,
  ) {}

  async checkout(order: Order): Promise<CheckoutSuccessResult> {
    // ── 1. Structural validation ──────────────────────────────────────────
    this.validateLegSum(order);

    // ── 2. Fraud checks ───────────────────────────────────────────────────
    const fraudContext: FraudContext = { order };
    // Throws FraudDeniedException → no charge is made.
    await this.fraudPipeline.run(fraudContext);

    // ── 3. Sequential leg charging with saga rollback ─────────────────────
    const sagaLog  = new SagaLog();
    const chargeIds: Record<string, string> = {};

    for (const leg of order.legs) {
      const provider = this.providerRegistry.get(leg.providerId);

      const baseRequest: Omit<ChargeRequest, 'idempotencyKey'> = {
        orderId:    order.orderId,
        customerId: order.customerId,
        amount:     leg.amount,
        metadata:   leg.metadata,
      };

      this.logger.info('Charging leg', {
        orderId:    order.orderId,
        providerId: provider.id,
        amount:     leg.amount.toString(),
      });

      const result = await this.chargeWithRetry.execute(provider, baseRequest);

      if (result.status !== 'SUCCESS') {
        this.logger.error('Leg failed — triggering saga rollback', {
          orderId:    order.orderId,
          providerId: provider.id,
          result,
          sagaSize:   sagaLog.size,
        });

        const compensationRecords = await sagaLog.compensate();
        throw new CheckoutFailedException(leg, result, compensationRecords);
      }

      // chargeId is always present on SUCCESS — assert is safe here
      const chargeId = result.chargeId!;

      sagaLog.record({ provider, chargeId, customerId: order.customerId, amount: leg.amount });
      chargeIds[provider.id] = chargeId;

      this.logger.info('Leg charged', { providerId: provider.id, chargeId });
    }

    this.logger.info('Checkout complete', { orderId: order.orderId, chargeIds });
    return { orderId: order.orderId, chargeIds, totalCharged: order.totalAmount };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private validateLegSum(order: Order): void {
    if (order.legs.length === 0) {
      throw new CheckoutValidationError(
        'Order must have at least one payment leg.',
      );
    }

    const zero = Money.of(0, order.totalAmount.currency);
    const sum  = order.legs.reduce((acc, leg) => acc.add(leg.amount), zero);

    if (!sum.equals(order.totalAmount)) {
      throw new CheckoutValidationError(
        `Payment legs sum to ${sum} but order total is ${order.totalAmount}. ` +
        `Each leg's amount must be explicitly specified; the system does not infer remainders.`,
      );
    }
  }
}
