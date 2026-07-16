import { IFraudCheck, FraudCheckResult, FraudContext } from './IFraudCheck';

/**
 * Abstraction over the 3-D Secure authentication flow (EMV 3DS).
 *
 * In production: inject an adapter that calls your 3DS server / card network.
 * In tests: inject a fake that returns `true` or `false` without network I/O.
 */
export interface ThreeDSecureAdapter {
  authenticate(customerId: string, orderId: string): Promise<boolean>;
}

/**
 * EU-required 3-D Secure check.
 *
 * Compliance team registers this in RegionCheckRegistry for Region.EU.
 * The payments team's CheckoutOrchestrator has zero knowledge of 3DS.
 */
export class ThreeDSecureCheck implements IFraudCheck {
  readonly name = 'ThreeDSecureCheck';

  constructor(private readonly adapter: ThreeDSecureAdapter) {}

  async check({ order }: FraudContext): Promise<FraudCheckResult> {
    const passed = await this.adapter.authenticate(order.customerId, order.orderId);
    return passed
      ? { checkName: this.name, verdict: 'PASS' }
      : {
          checkName: this.name,
          verdict:   'DENY',
          reason:    '3-D Secure authentication failed or was not completed',
        };
  }
}
