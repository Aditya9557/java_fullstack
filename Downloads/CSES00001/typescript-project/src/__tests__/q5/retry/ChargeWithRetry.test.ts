import { describe, it, expect } from 'vitest';
import { ChargeWithRetry }      from '../../../q5/retry/ChargeWithRetry';
import {
  IPaymentProvider,
  ProviderCapabilities,
  ChargeRequest,
  ChargeResult,
  CompensationResult,
} from '../../../q5/providers/IPaymentProvider';
import { Money } from '../../../q5/domain/Money';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** No-op sleep so retries run instantly in tests. */
const noSleep = async (_ms: number): Promise<void> => {};

function makeBaseRequest(): Omit<ChargeRequest, 'idempotencyKey'> {
  return {
    orderId:    'order-retry-test',
    customerId: 'cust-retry-test',
    amount:     Money.of(5000),
  };
}

/**
 * Builds a fake provider that returns `responses` in sequence.
 * If more calls than responses, the last response is repeated.
 */
function makeProvider(
  id:           string,
  isIdempotent: boolean,
  responses:    ChargeResult[],
): IPaymentProvider & { callCount: number } {
  let callCount = 0;

  const capabilities: ProviderCapabilities = {
    supportsRefunds:        true,
    supportsPartialCapture: false,
    supportsExternalCard:   true,
    isIdempotent,
  };

  return {
    id,
    capabilities,
    get callCount() { return callCount; },
    async charge(_req: ChargeRequest): Promise<ChargeResult> {
      return responses[Math.min(callCount++, responses.length - 1)];
    },
    async compensate(
      _chargeId:   string,
      _customerId: string,
      _amount:     Money,
    ): Promise<CompensationResult> {
      return { status: 'SUCCESS' };
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ChargeWithRetry', () => {
  const policy = new ChargeWithRetry({ maxAttempts: 3, initialBackoffMs: 10 });

  describe('SUCCESS', () => {
    it('returns immediately on the first attempt', async () => {
      const provider = makeProvider('stripe', true, [
        { status: 'SUCCESS', chargeId: 'ch_1' },
      ]);
      const result = await policy.execute(provider, makeBaseRequest(), noSleep);
      expect(result.status).toBe('SUCCESS');
      expect(result.chargeId).toBe('ch_1');
      expect(provider.callCount).toBe(1);
    });
  });

  describe('PERMANENT_FAILURE', () => {
    it('does not retry — returns after the first attempt', async () => {
      const provider = makeProvider('stripe', true, [
        { status: 'PERMANENT_FAILURE', errorCode: 'CARD_DECLINED' },
        { status: 'SUCCESS', chargeId: 'should-not-reach' },
      ]);
      const result = await policy.execute(provider, makeBaseRequest(), noSleep);
      expect(result.status).toBe('PERMANENT_FAILURE');
      expect(provider.callCount).toBe(1);
    });
  });

  describe('TRANSIENT_FAILURE', () => {
    it('retries and succeeds on the third attempt', async () => {
      const provider = makeProvider('stripe', true, [
        { status: 'TRANSIENT_FAILURE', errorCode: 'RATE_LIMITED' },
        { status: 'TRANSIENT_FAILURE', errorCode: 'RATE_LIMITED' },
        { status: 'SUCCESS', chargeId: 'ch_ok' },
      ]);
      const result = await policy.execute(provider, makeBaseRequest(), noSleep);
      expect(result.status).toBe('SUCCESS');
      expect(provider.callCount).toBe(3);
    });

    it('returns the last failure after exhausting all attempts', async () => {
      const provider = makeProvider('stripe', true, [
        { status: 'TRANSIENT_FAILURE', errorCode: 'RATE_LIMITED' },
      ]);
      const result = await policy.execute(provider, makeBaseRequest(), noSleep);
      expect(result.status).toBe('TRANSIENT_FAILURE');
      expect(provider.callCount).toBe(3); // maxAttempts = 3
    });
  });

  describe('UNKNOWN_OUTCOME', () => {
    it('ABORTS immediately for a non-idempotent provider to prevent double-charge', async () => {
      const provider = makeProvider('paypal', false, [
        { status: 'UNKNOWN_OUTCOME', errorCode: 'TIMEOUT' },
        { status: 'SUCCESS', chargeId: 'should-never-reach' },
      ]);
      const result = await policy.execute(provider, makeBaseRequest(), noSleep);
      // Aborted — re-labelled as PERMANENT_FAILURE with a specific error code
      expect(result.status).toBe('PERMANENT_FAILURE');
      expect(result.errorCode).toBe('ABORT_NON_IDEMPOTENT_UNKNOWN_OUTCOME');
      expect(provider.callCount).toBe(1); // never retried
    });

    it('retries safely for an idempotent provider (same key = provider deduplicates)', async () => {
      const provider = makeProvider('stripe', true, [
        { status: 'UNKNOWN_OUTCOME', errorCode: 'TIMEOUT' },
        { status: 'SUCCESS', chargeId: 'ch_replay' },
      ]);
      const result = await policy.execute(provider, makeBaseRequest(), noSleep);
      expect(result.status).toBe('SUCCESS');
      expect(result.chargeId).toBe('ch_replay');
      expect(provider.callCount).toBe(2);
    });
  });

  describe('Idempotency-key strategy', () => {
    it('uses the SAME key across all retries for idempotent providers', async () => {
      const seenKeys: string[] = [];
      const provider: IPaymentProvider = {
        id: 'stripe',
        capabilities: {
          supportsRefunds:        true,
          supportsPartialCapture: false,
          supportsExternalCard:   true,
          isIdempotent:           true,
        },
        async charge(req: ChargeRequest): Promise<ChargeResult> {
          seenKeys.push(req.idempotencyKey);
          if (seenKeys.length < 3) return { status: 'TRANSIENT_FAILURE' };
          return { status: 'SUCCESS', chargeId: 'ch_ok' };
        },
        async compensate(
          _chargeId:   string,
          _customerId: string,
          _amount:     Money,
        ): Promise<CompensationResult> {
          return { status: 'SUCCESS' };
        },
      };

      await policy.execute(provider, makeBaseRequest(), noSleep);

      expect(seenKeys).toHaveLength(3);
      // All three attempts used the exact same key
      expect(new Set(seenKeys).size).toBe(1);
    });

    it('uses a DIFFERENT key per attempt for non-idempotent providers (TRANSIENT)', async () => {
      const seenKeys: string[] = [];
      const provider: IPaymentProvider = {
        id: 'paypal',
        capabilities: {
          supportsRefunds:        true,
          supportsPartialCapture: false,
          supportsExternalCard:   true,
          isIdempotent:           false,
        },
        async charge(req: ChargeRequest): Promise<ChargeResult> {
          seenKeys.push(req.idempotencyKey);
          if (seenKeys.length < 3) return { status: 'TRANSIENT_FAILURE' };
          return { status: 'SUCCESS', chargeId: 'pp_ok' };
        },
        async compensate(
          _chargeId:   string,
          _customerId: string,
          _amount:     Money,
        ): Promise<CompensationResult> {
          return { status: 'SUCCESS' };
        },
      };

      await policy.execute(provider, makeBaseRequest(), noSleep);

      expect(seenKeys).toHaveLength(3);
      // Every attempt gets a fresh key
      expect(new Set(seenKeys).size).toBe(3);
    });
  });
});
