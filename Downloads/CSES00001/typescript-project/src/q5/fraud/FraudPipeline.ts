import { FraudContext, FraudCheckResult, FraudDeniedException, IFraudCheck } from './IFraudCheck';
import { RegionCheckRegistry }                                               from './RegionCheckRegistry';

// Re-export so callers only need one import for the exception
export { FraudDeniedException } from './IFraudCheck';

/**
 * Runs the region-specific fraud-check chain in sequence.
 *
 * - PASS / REVIEW verdicts continue the chain.
 * - DENY short-circuits and throws `FraudDeniedException` — no charge is made.
 *
 * Owned by the payments team. The compliance team extends behaviour exclusively
 * through `RegionCheckRegistry`; this file never changes for new rules.
 */
export class FraudPipeline {
  constructor(private readonly registry: RegionCheckRegistry) {}

  async run(context: FraudContext): Promise<ReadonlyArray<FraudCheckResult>> {
    const checks: ReadonlyArray<IFraudCheck> = this.registry.getChecks(
      context.order.region,
    );
    const results: FraudCheckResult[] = [];

    for (const check of checks) {
      const result = await check.check(context);
      results.push(result);

      if (result.verdict === 'DENY') {
        throw new FraudDeniedException(
          result.checkName,
          result.reason ?? 'No reason provided',
        );
      }
    }

    return results;
  }
}
