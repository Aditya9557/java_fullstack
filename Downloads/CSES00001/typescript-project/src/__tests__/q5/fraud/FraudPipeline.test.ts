import { describe, it, expect }   from 'vitest';
import { FraudPipeline }          from '../../../q5/fraud/FraudPipeline';
import { FraudDeniedException }   from '../../../q5/fraud/IFraudCheck';
import { RegionCheckRegistry }    from '../../../q5/fraud/RegionCheckRegistry';
import { BasicFraudCheck }        from '../../../q5/fraud/BasicFraudCheck';
import { ThreeDSecureCheck, ThreeDSecureAdapter } from '../../../q5/fraud/ThreeDSecureCheck';
import {
  IFraudCheck,
  FraudCheckResult,
  FraudContext,
} from '../../../q5/fraud/IFraudCheck';
import { Region } from '../../../q5/domain/Region';
import { Money }  from '../../../q5/domain/Money';
import { Order }  from '../../../q5/domain/Order';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeOrder(region: Region, amountCents = 5000): Order {
  return {
    orderId:     'order-fraud-test',
    customerId:  'cust-fraud-test',
    region,
    totalAmount: Money.of(amountCents),
    legs:        [],
  };
}

function makeContext(
  region:    Region,
  amount     = 5000,
  riskScore?: number,
): FraudContext {
  return { order: makeOrder(region, amount), customerRiskScore: riskScore };
}

function alwaysDeny(reason: string): IFraudCheck {
  return {
    name: 'AlwaysDeny',
    async check(): Promise<FraudCheckResult> {
      return { checkName: 'AlwaysDeny', verdict: 'DENY', reason };
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FraudPipeline', () => {

  describe('US region — BasicFraudCheck only', () => {
    function buildPipeline() {
      const registry = new RegionCheckRegistry();
      registry.registerChecks(Region.US, [new BasicFraudCheck()]);
      return new FraudPipeline(registry);
    }

    it('passes for a normal low-value transaction', async () => {
      const results = await buildPipeline().run(makeContext(Region.US, 5000));
      expect(results).toHaveLength(1);
      expect(results[0].verdict).toBe('PASS');
    });

    it('returns REVIEW for transactions over $10,000 (does not throw)', async () => {
      const results = await buildPipeline().run(makeContext(Region.US, 1_000_001));
      expect(results[0].verdict).toBe('REVIEW');
    });

    it('throws FraudDeniedException when customer risk score ≥ 90', async () => {
      await expect(buildPipeline().run(makeContext(Region.US, 5000, 95)))
        .rejects.toBeInstanceOf(FraudDeniedException);
    });

    it('FraudDeniedException carries the check name and reason', async () => {
      let err: FraudDeniedException | undefined;
      try {
        await buildPipeline().run(makeContext(Region.US, 5000, 95));
      } catch (e) {
        err = e as FraudDeniedException;
      }
      expect(err!.checkName).toBe('BasicFraudCheck');
      expect(err!.reason).toMatch(/risk score/i);
    });
  });

  describe('EU region — BasicFraudCheck + 3-D Secure', () => {
    function buildEUPipeline(threeDSResult: boolean) {
      const adapter: ThreeDSecureAdapter = {
        authenticate: async () => threeDSResult,
      };
      const registry = new RegionCheckRegistry();
      registry.registerChecks(Region.EU, [
        new BasicFraudCheck(),
        new ThreeDSecureCheck(adapter),
      ]);
      return new FraudPipeline(registry);
    }

    it('passes when both BasicFraudCheck and 3DS pass', async () => {
      const results = await buildEUPipeline(true).run(makeContext(Region.EU));
      expect(results).toHaveLength(2);
      expect(results.every(r => r.verdict === 'PASS')).toBe(true);
    });

    it('throws FraudDeniedException when 3DS fails', async () => {
      await expect(buildEUPipeline(false).run(makeContext(Region.EU)))
        .rejects.toBeInstanceOf(FraudDeniedException);
    });

    it('FraudDeniedException from 3DS has the correct check name', async () => {
      let err: FraudDeniedException | undefined;
      try {
        await buildEUPipeline(false).run(makeContext(Region.EU));
      } catch (e) {
        err = e as FraudDeniedException;
      }
      expect(err!.checkName).toBe('ThreeDSecureCheck');
    });

    it('short-circuits: 3DS is never called when BasicFraudCheck denies', async () => {
      let threeDSCalled = false;
      const adapter: ThreeDSecureAdapter = {
        authenticate: async () => { threeDSCalled = true; return true; },
      };
      const registry = new RegionCheckRegistry();
      registry.registerChecks(Region.EU, [
        alwaysDeny('high-risk IP'),
        new ThreeDSecureCheck(adapter),
      ]);
      const pipeline = new FraudPipeline(registry);

      await expect(pipeline.run(makeContext(Region.EU))).rejects.toBeInstanceOf(
        FraudDeniedException,
      );
      expect(threeDSCalled).toBe(false);
    });
  });

  describe('Region with no checks registered', () => {
    it('passes with an empty results array (no checks → no denial)', async () => {
      const registry = new RegionCheckRegistry(); // nothing registered for APAC
      const pipeline = new FraudPipeline(registry);
      const results  = await pipeline.run(makeContext(Region.APAC));
      expect(results).toHaveLength(0);
    });
  });

  describe('Compliance extensibility', () => {
    it('compliance can add a new check to a region without touching FraudPipeline', async () => {
      // A custom compliance check — no FraudPipeline or orchestrator changes
      const velocityCheck: IFraudCheck = {
        name: 'VelocityCheck',
        async check(ctx: FraudContext): Promise<FraudCheckResult> {
          // deny if more than 3 legs (simulated velocity signal)
          return ctx.order.legs.length > 3
            ? { checkName: 'VelocityCheck', verdict: 'DENY', reason: 'Too many legs' }
            : { checkName: 'VelocityCheck', verdict: 'PASS' };
        },
      };

      const registry = new RegionCheckRegistry();
      registry.registerChecks(Region.UK, [new BasicFraudCheck(), velocityCheck]);
      const pipeline = new FraudPipeline(registry);

      const results = await pipeline.run(makeContext(Region.UK, 5000));
      expect(results.map(r => r.checkName)).toContain('VelocityCheck');
    });
  });
});
