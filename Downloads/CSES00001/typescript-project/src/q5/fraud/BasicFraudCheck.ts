import { IFraudCheck, FraudCheckResult, FraudContext } from './IFraudCheck';

const HIGH_VALUE_THRESHOLD_CENTS = 1_000_000; // $10,000

/**
 * Baseline fraud check — runs in every region.
 *
 * Rules (extensible — compliance adds to this without touching FraudPipeline):
 *   • Customer risk score ≥ 90 → DENY
 *   • Transaction value > $10,000 → REVIEW (manual queue)
 *   • Otherwise → PASS
 */
export class BasicFraudCheck implements IFraudCheck {
  readonly name = 'BasicFraudCheck';

  async check({ order, customerRiskScore }: FraudContext): Promise<FraudCheckResult> {
    if (customerRiskScore !== undefined && customerRiskScore >= 90) {
      return {
        checkName: this.name,
        verdict:   'DENY',
        reason:    `Customer risk score ${customerRiskScore} exceeds threshold of 90`,
      };
    }

    if (order.totalAmount.amountCents > HIGH_VALUE_THRESHOLD_CENTS) {
      return {
        checkName: this.name,
        verdict:   'REVIEW',
        reason:    `High-value transaction (${order.totalAmount}) requires manual review`,
      };
    }

    return { checkName: this.name, verdict: 'PASS' };
  }
}
