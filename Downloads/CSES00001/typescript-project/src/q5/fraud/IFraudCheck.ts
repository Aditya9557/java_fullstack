import { Order } from '../domain/Order';

// ── Verdict ───────────────────────────────────────────────────────────────────

export type FraudVerdict = 'PASS' | 'REVIEW' | 'DENY';

export interface FraudCheckResult {
  readonly checkName: string;
  readonly verdict:   FraudVerdict;
  readonly reason?:   string;
}

// ── Context passed to every check ─────────────────────────────────────────────

export interface FraudContext {
  readonly order:              Order;
  /** Composite risk score 0–100 computed upstream (e.g. by an ML model). */
  readonly customerRiskScore?: number;
  readonly deviceFingerprint?: string;
}

// ── Exception thrown by FraudPipeline ────────────────────────────────────────

export class FraudDeniedException extends Error {
  constructor(
    public readonly checkName: string,
    public readonly reason:    string,
  ) {
    super(`Fraud check '${checkName}' denied transaction: ${reason}`);
    this.name = 'FraudDeniedException';
  }
}

// ── Check interface ───────────────────────────────────────────────────────────

/**
 * A single fraud-check rule.
 *
 * **Compliance team entry point** — implement this interface and register in
 * `RegionCheckRegistry`. No payments-team code review needed.
 */
export interface IFraudCheck {
  readonly name: string;
  check(context: FraudContext): Promise<FraudCheckResult>;
}
