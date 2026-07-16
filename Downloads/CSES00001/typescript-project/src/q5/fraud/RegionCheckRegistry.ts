import { Region }      from '../domain/Region';
import { IFraudCheck } from './IFraudCheck';

/**
 * Maps regions to their required fraud-check chains.
 *
 * **Compliance team entry point.** To add 3-D Secure to EU:
 *
 * ```ts
 * registry.registerChecks(Region.EU, [
 *   new BasicFraudCheck(),
 *   new ThreeDSecureCheck(threeDSAdapter),
 * ]);
 * ```
 *
 * The payments team's `FraudPipeline` calls `getChecks(region)` without
 * knowing what checks are inside — open/closed principle.
 */
export class RegionCheckRegistry {
  private readonly registry = new Map<Region, IFraudCheck[]>();

  /** Register (or replace) the check chain for a region. */
  registerChecks(region: Region, checks: ReadonlyArray<IFraudCheck>): void {
    this.registry.set(region, [...checks]);
  }

  /**
   * Retrieve the checks for a region.
   * Returns an empty array if no checks are registered (no fraud checks → always passes).
   */
  getChecks(region: Region): ReadonlyArray<IFraudCheck> {
    return this.registry.get(region) ?? [];
  }
}
