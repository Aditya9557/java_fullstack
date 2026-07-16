import { describe, it, expect }    from 'vitest';
import { CheckoutOrchestrator }    from '../../../q5/checkout/CheckoutOrchestrator';
import {
  CheckoutFailedException,
  CheckoutValidationError,
} from '../../../q5/checkout/CheckoutResult';
import { ProviderRegistry }        from '../../../q5/providers/ProviderRegistry';
import { FraudPipeline }           from '../../../q5/fraud/FraudPipeline';
import { FraudDeniedException }    from '../../../q5/fraud/IFraudCheck';
import { RegionCheckRegistry }     from '../../../q5/fraud/RegionCheckRegistry';
import { BasicFraudCheck }         from '../../../q5/fraud/BasicFraudCheck';
import { ChargeWithRetry }         from '../../../q5/retry/ChargeWithRetry';
import { NoOpLogger }              from '../../../q5/Logger';
import {
  IPaymentProvider,
  ProviderCapabilities,
  ChargeRequest,
  ChargeResult,
  CompensationResult,
} from '../../../q5/providers/IPaymentProvider';
import {
  IFraudCheck,
  FraudCheckResult,
  FraudContext,
} from '../../../q5/fraud/IFraudCheck';
import { Money }   from '../../../q5/domain/Money';
import { Order }   from '../../../q5/domain/Order';
import { Region }  from '../../../q5/domain/Region';

// ── Fake provider factory ─────────────────────────────────────────────────────

interface FakeConfig {
  id:                string;
  chargeResult:      ChargeResult;
  compensateResult?: CompensationResult;
  isIdempotent?:     boolean;
}

interface FakeProvider extends IPaymentProvider {
  readonly chargeCallCount:     number;
  readonly compensateCallCount: number;
}

function makeFake(cfg: FakeConfig): FakeProvider {
  let chargeCallCount     = 0;
  let compensateCallCount = 0;

  const capabilities: ProviderCapabilities = {
    supportsRefunds:        true,
    supportsPartialCapture: false,
    supportsExternalCard:   true,
    isIdempotent:           cfg.isIdempotent ?? true,
  };

  return {
    id: cfg.id,
    capabilities,
    get chargeCallCount()     { return chargeCallCount; },
    get compensateCallCount() { return compensateCallCount; },

    async charge(_req: ChargeRequest): Promise<ChargeResult> {
      chargeCallCount++;
      return cfg.chargeResult;
    },
    async compensate(
      _chargeId:   string,
      _customerId: string,
      _amount:     Money,
    ): Promise<CompensationResult> {
      compensateCallCount++;
      return cfg.compensateResult ?? { status: 'SUCCESS' };
    },
  };
}

// ── Orchestrator builder ──────────────────────────────────────────────────────

function buildOrchestrator(
  providers:   FakeProvider[],
  fraudChecks: IFraudCheck[] = [new BasicFraudCheck()],
  region:      Region        = Region.US,
): { orchestrator: CheckoutOrchestrator } {
  const registry = new ProviderRegistry();
  for (const p of providers) registry.register(p);

  const checkRegistry = new RegionCheckRegistry();
  checkRegistry.registerChecks(region, fraudChecks);

  const pipeline     = new FraudPipeline(checkRegistry);
  const retryPolicy  = new ChargeWithRetry({ maxAttempts: 1, initialBackoffMs: 0 });

  return {
    orchestrator: new CheckoutOrchestrator(
      registry, pipeline, retryPolicy, new NoOpLogger(),
    ),
  };
}

// ── Order builder ─────────────────────────────────────────────────────────────

function makeOrder(
  legs:   Array<{ providerId: string; amountCents: number }>,
  region: Region = Region.US,
): Order {
  const legSpecs = legs.map(l => ({
    providerId: l.providerId,
    amount:     Money.of(l.amountCents),
  }));
  const total = legSpecs.reduce((acc, l) => acc.add(l.amount), Money.of(0));
  return {
    orderId:     'order-test',
    customerId:  'cust-test',
    region,
    totalAmount: total,
    legs:        legSpecs,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CheckoutOrchestrator', () => {

  // ── Validation ─────────────────────────────────────────────────────────────

  describe('Validation', () => {
    it('throws CheckoutValidationError when legs sum does not match order total', async () => {
      const stripe = makeFake({
        id:           'stripe',
        chargeResult: { status: 'SUCCESS', chargeId: 'ch_1' },
      });
      const { orchestrator } = buildOrchestrator([stripe]);

      const order: Order = {
        orderId:     'order-bad',
        customerId:  'cust-1',
        region:      Region.US,
        totalAmount: Money.of(10000), // $100
        legs: [{ providerId: 'stripe', amount: Money.of(5000) }], // only $50
      };

      await expect(orchestrator.checkout(order)).rejects.toBeInstanceOf(
        CheckoutValidationError,
      );
      expect(stripe.chargeCallCount).toBe(0); // never charged
    });

    it('throws CheckoutValidationError for an order with no legs', async () => {
      const { orchestrator } = buildOrchestrator([]);
      const order: Order = {
        orderId:     'order-empty',
        customerId:  'cust-1',
        region:      Region.US,
        totalAmount: Money.of(5000),
        legs:        [],
      };
      await expect(orchestrator.checkout(order)).rejects.toBeInstanceOf(
        CheckoutValidationError,
      );
    });
  });

  // ── Fraud checks ────────────────────────────────────────────────────────────

  describe('Fraud checks', () => {
    it('throws FraudDeniedException and makes zero charges when fraud denies', async () => {
      const stripe = makeFake({
        id:           'stripe',
        chargeResult: { status: 'SUCCESS', chargeId: 'ch_1' },
      });

      const denyAll: IFraudCheck = {
        name: 'AlwaysDeny',
        async check(_ctx: FraudContext): Promise<FraudCheckResult> {
          return { checkName: 'AlwaysDeny', verdict: 'DENY', reason: 'Test' };
        },
      };

      const { orchestrator } = buildOrchestrator([stripe], [denyAll]);
      await expect(orchestrator.checkout(makeOrder([{ providerId: 'stripe', amountCents: 5000 }])))
        .rejects.toBeInstanceOf(FraudDeniedException);

      expect(stripe.chargeCallCount).toBe(0); // critical: no money moved
    });
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  describe('Happy path', () => {
    it('single-leg checkout succeeds and returns the chargeId', async () => {
      const stripe = makeFake({
        id:           'stripe',
        chargeResult: { status: 'SUCCESS', chargeId: 'ch_stripe_1' },
      });
      const { orchestrator } = buildOrchestrator([stripe]);
      const result = await orchestrator.checkout(
        makeOrder([{ providerId: 'stripe', amountCents: 10000 }]),
      );

      expect(result.orderId).toBe('order-test');
      expect(result.chargeIds['stripe']).toBe('ch_stripe_1');
      expect(result.totalCharged.amountCents).toBe(10000);
    });

    it('split payment: $30 store-credit + $70 stripe — both charged', async () => {
      const sc     = makeFake({ id: 'store-credit', chargeResult: { status: 'SUCCESS', chargeId: 'sc_1' } });
      const stripe = makeFake({ id: 'stripe',       chargeResult: { status: 'SUCCESS', chargeId: 'ch_1' } });
      const { orchestrator } = buildOrchestrator([sc, stripe]);

      const result = await orchestrator.checkout(makeOrder([
        { providerId: 'store-credit', amountCents: 3000 },
        { providerId: 'stripe',       amountCents: 7000 },
      ]));

      expect(result.chargeIds['store-credit']).toBe('sc_1');
      expect(result.chargeIds['stripe']).toBe('ch_1');
      expect(result.totalCharged.amountCents).toBe(10000);
    });

    it('three-way split succeeds for all three providers', async () => {
      const sc     = makeFake({ id: 'store-credit', chargeResult: { status: 'SUCCESS', chargeId: 'sc_tx' } });
      const paypal = makeFake({ id: 'paypal',       chargeResult: { status: 'SUCCESS', chargeId: 'pp_tx' } });
      const stripe = makeFake({ id: 'stripe',       chargeResult: { status: 'SUCCESS', chargeId: 'ch_tx' } });
      const { orchestrator } = buildOrchestrator([sc, paypal, stripe]);

      const result = await orchestrator.checkout(makeOrder([
        { providerId: 'store-credit', amountCents: 2000 },
        { providerId: 'paypal',       amountCents: 3000 },
        { providerId: 'stripe',       amountCents: 5000 },
      ]));

      expect(Object.keys(result.chargeIds)).toHaveLength(3);
    });
  });

  // ── Saga rollback ───────────────────────────────────────────────────────────

  describe('Saga rollback', () => {
    it('compensates leg 1 when leg 2 fails', async () => {
      const sc     = makeFake({ id: 'store-credit', chargeResult: { status: 'SUCCESS', chargeId: 'sc_1' } });
      const stripe = makeFake({ id: 'stripe',       chargeResult: { status: 'PERMANENT_FAILURE', errorCode: 'CARD_DECLINED' } });
      const { orchestrator } = buildOrchestrator([sc, stripe]);

      let ex: CheckoutFailedException | undefined;
      try {
        await orchestrator.checkout(makeOrder([
          { providerId: 'store-credit', amountCents: 3000 },
          { providerId: 'stripe',       amountCents: 7000 },
        ]));
      } catch (e) { ex = e as CheckoutFailedException; }

      expect(ex).toBeInstanceOf(CheckoutFailedException);
      expect(ex!.failedLeg.providerId).toBe('stripe');

      // store-credit was charged then compensated; stripe was attempted but not compensated
      expect(sc.chargeCallCount).toBe(1);
      expect(sc.compensateCallCount).toBe(1);
      expect(stripe.chargeCallCount).toBe(1);
      expect(stripe.compensateCallCount).toBe(0);
    });

    it('no compensation when the first leg fails (nothing to roll back)', async () => {
      const stripe = makeFake({ id: 'stripe', chargeResult: { status: 'PERMANENT_FAILURE', errorCode: 'CARD_DECLINED' } });
      const { orchestrator } = buildOrchestrator([stripe]);

      await expect(orchestrator.checkout(
        makeOrder([{ providerId: 'stripe', amountCents: 5000 }]),
      )).rejects.toBeInstanceOf(CheckoutFailedException);

      expect(stripe.compensateCallCount).toBe(0);
    });

    it('compensates legs in LIFO order (last charged = first compensated)', async () => {
      const compensatedOrder: string[] = [];

      function makeTracked(id: string, charge: ChargeResult): FakeProvider {
        const capabilities: ProviderCapabilities = {
          supportsRefunds: true, supportsPartialCapture: false,
          supportsExternalCard: true, isIdempotent: true,
        };
        let chargeCallCount = 0; let compensateCallCount = 0;
        return {
          id, capabilities,
          get chargeCallCount()     { return chargeCallCount; },
          get compensateCallCount() { return compensateCallCount; },
          async charge(_req: ChargeRequest): Promise<ChargeResult> {
            chargeCallCount++;
            return charge;
          },
          async compensate(_cid: string, _cust: string, _amt: Money): Promise<CompensationResult> {
            compensateCallCount++;
            compensatedOrder.push(id);
            return { status: 'SUCCESS' };
          },
        };
      }

      const sc     = makeTracked('store-credit', { status: 'SUCCESS', chargeId: 'sc_1' });
      const paypal = makeTracked('paypal',        { status: 'SUCCESS', chargeId: 'pp_1' });
      const stripe = makeTracked('stripe',        { status: 'PERMANENT_FAILURE', errorCode: 'CARD_DECLINED' });

      const registry = new ProviderRegistry();
      [sc, paypal, stripe].forEach(p => registry.register(p));

      const checkRegistry = new RegionCheckRegistry();
      checkRegistry.registerChecks(Region.US, [new BasicFraudCheck()]);
      const orchestrator = new CheckoutOrchestrator(
        registry,
        new FraudPipeline(checkRegistry),
        new ChargeWithRetry({ maxAttempts: 1, initialBackoffMs: 0 }),
        new NoOpLogger(),
      );

      let ex: CheckoutFailedException | undefined;
      try {
        await orchestrator.checkout(makeOrder([
          { providerId: 'store-credit', amountCents: 2000 },
          { providerId: 'paypal',       amountCents: 3000 },
          { providerId: 'stripe',       amountCents: 5000 },
        ]));
      } catch (e) { ex = e as CheckoutFailedException; }

      // Compensation records in the exception
      expect(ex!.compensationRecords).toHaveLength(2);

      // LIFO: paypal was charged second → compensated first
      expect(compensatedOrder).toEqual(['paypal', 'store-credit']);
      expect(ex!.compensationRecords[0].providerId).toBe('paypal');
      expect(ex!.compensationRecords[1].providerId).toBe('store-credit');
    });

    it('CheckoutFailedException carries compensation records with status', async () => {
      const sc     = makeFake({ id: 'store-credit', chargeResult: { status: 'SUCCESS', chargeId: 'sc_1' }, compensateResult: { status: 'SUCCESS' } });
      const stripe = makeFake({ id: 'stripe',       chargeResult: { status: 'PERMANENT_FAILURE', errorCode: 'DECLINED' } });
      const { orchestrator } = buildOrchestrator([sc, stripe]);

      let ex: CheckoutFailedException | undefined;
      try {
        await orchestrator.checkout(makeOrder([
          { providerId: 'store-credit', amountCents: 3000 },
          { providerId: 'stripe',       amountCents: 7000 },
        ]));
      } catch (e) { ex = e as CheckoutFailedException; }

      expect(ex!.compensationRecords[0].status).toBe('COMPENSATED');
      expect(ex!.compensationRecords[0].providerId).toBe('store-credit');
    });
  });
});
