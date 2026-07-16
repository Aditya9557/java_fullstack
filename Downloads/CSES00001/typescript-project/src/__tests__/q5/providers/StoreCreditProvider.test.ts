import { describe, it, expect, vi } from 'vitest';
import {
  StoreCreditProvider,
  StoreCreditWallet,
} from '../../../q5/providers/StoreCreditProvider';
import { Money }        from '../../../q5/domain/Money';
import { ChargeRequest } from '../../../q5/providers/IPaymentProvider';

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeRequest(amountCents: number, idempotencyKey = 'key-1'): ChargeRequest {
  return {
    orderId:        'order-1',
    customerId:     'cust-1',
    amount:         Money.of(amountCents),
    idempotencyKey,
  };
}

function makeWallet(
  balance:  number,
  deductFn: StoreCreditWallet['deduct'] = async (_c, _a, txId) => txId,
  creditFn: StoreCreditWallet['credit'] = async () => {},
): StoreCreditWallet {
  return {
    getBalance: async () => balance,
    deduct:     deductFn,
    credit:     creditFn,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StoreCreditProvider', () => {

  describe('capabilities', () => {
    it('does not support external card processing', () => {
      const provider = new StoreCreditProvider(makeWallet(0));
      expect(provider.capabilities.supportsExternalCard).toBe(false);
    });

    it('does not support customer-facing refunds', () => {
      const provider = new StoreCreditProvider(makeWallet(0));
      expect(provider.capabilities.supportsRefunds).toBe(false);
    });

    it('is idempotent (wallet deducts by transactionId)', () => {
      const provider = new StoreCreditProvider(makeWallet(0));
      expect(provider.capabilities.isIdempotent).toBe(true);
    });

    it('has no refund() method (no external card to refund to)', () => {
      const provider = new StoreCreditProvider(makeWallet(0));
      expect(provider.refund).toBeUndefined();
    });
  });

  describe('charge()', () => {
    it('returns SUCCESS and the wallet transactionId when balance is sufficient', async () => {
      const wallet = makeWallet(5000, async (_cid, _amt, txId) => `wallet-${txId}`);
      const provider = new StoreCreditProvider(wallet);

      const result = await provider.charge(makeRequest(3000, 'idem-key'));
      expect(result.status).toBe('SUCCESS');
      expect(result.chargeId).toBe('wallet-idem-key');
    });

    it('returns PERMANENT_FAILURE when balance is insufficient', async () => {
      const provider = new StoreCreditProvider(makeWallet(500));
      const result   = await provider.charge(makeRequest(3000));
      expect(result.status).toBe('PERMANENT_FAILURE');
      expect(result.errorCode).toBe('INSUFFICIENT_STORE_CREDIT');
    });

    it('returns PERMANENT_FAILURE even if balance is off by 1 cent', async () => {
      const provider = new StoreCreditProvider(makeWallet(2999));
      const result   = await provider.charge(makeRequest(3000));
      expect(result.status).toBe('PERMANENT_FAILURE');
    });

    it('returns SUCCESS when balance exactly equals the charge amount', async () => {
      const provider = new StoreCreditProvider(makeWallet(3000));
      const result   = await provider.charge(makeRequest(3000));
      expect(result.status).toBe('SUCCESS');
    });

    it('returns TRANSIENT_FAILURE when wallet.deduct throws', async () => {
      const wallet = makeWallet(
        9999,
        async () => { throw new Error('Wallet service unavailable'); },
      );
      const provider = new StoreCreditProvider(wallet);
      const result   = await provider.charge(makeRequest(1000));
      expect(result.status).toBe('TRANSIENT_FAILURE');
      expect(result.errorCode).toBe('WALLET_DEDUCT_ERROR');
    });
  });

  describe('compensate()', () => {
    it('credits the exact amount back to the wallet', async () => {
      const credit   = vi.fn(async () => {});
      const wallet   = makeWallet(0, async (_c, _a, txId) => txId, credit);
      const provider = new StoreCreditProvider(wallet);

      const result = await provider.compensate('tx-1', 'cust-1', Money.of(3000));
      expect(result.status).toBe('SUCCESS');
      expect(credit).toHaveBeenCalledOnce();
      expect(credit).toHaveBeenCalledWith('cust-1', 3000);
    });

    it('returns FAILED when wallet.credit throws', async () => {
      const wallet = makeWallet(
        0,
        async (_c, _a, txId) => txId,
        async () => { throw new Error('Wallet down'); },
      );
      const provider = new StoreCreditProvider(wallet);
      const result   = await provider.compensate('tx-1', 'cust-1', Money.of(1000));
      expect(result.status).toBe('FAILED');
      expect(result.reason).toContain('Wallet down');
    });
  });
});
