import {
  IPaymentProvider,
  ProviderCapabilities,
  ChargeRequest,
  ChargeResult,
  CompensationResult,
} from './IPaymentProvider';
import { Money } from '../domain/Money';

/**
 * Abstraction over the in-house store-credit wallet.
 *
 * Finance team provides the concrete implementation backed by your DB.
 * In tests: inject an in-memory fake — zero network calls.
 */
export interface StoreCreditWallet {
  /** Returns the current balance in **cents** for the given customer. */
  getBalance(customerId: string): Promise<number>;
  /**
   * Atomically deducts `amountCents` from the customer's wallet.
   * Must be idempotent on `transactionId` — replaying the same id is a no-op.
   * Returns the transaction id (same as the input on replay).
   */
  deduct(
    customerId:    string,
    amountCents:   number,
    transactionId: string,
  ): Promise<string>;
  /**
   * Credits `amountCents` back to the customer's wallet.
   * Used exclusively for saga compensation — not user-visible.
   */
  credit(customerId: string, amountCents: number): Promise<void>;
}

/**
 * In-house store-credit provider.
 *
 * Capabilities:
 *   ❌ supportsRefunds        — store credit cannot be refunded to an external card
 *   ❌ supportsPartialCapture — wallet deducts the exact amount
 *   ❌ supportsExternalCard   — deduct-only; this provider NEVER touches card data
 *   ✅ isIdempotent           — wallet.deduct is idempotent by transactionId
 *
 * Saga compensation: calls `wallet.credit()` to restore the balance in-house.
 * This is intentionally different from `refund()` (which is absent) — there is
 * no external payment method to refund to.
 */
export class StoreCreditProvider implements IPaymentProvider {
  readonly id = 'store-credit';

  readonly capabilities: ProviderCapabilities = {
    supportsRefunds:        false,
    supportsPartialCapture: false,
    supportsExternalCard:   false,
    isIdempotent:           true,
  };

  constructor(private readonly wallet: StoreCreditWallet) {}

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const balance = await this.wallet.getBalance(request.customerId);

    if (balance < request.amount.amountCents) {
      return {
        status:       'PERMANENT_FAILURE',
        errorCode:    'INSUFFICIENT_STORE_CREDIT',
        errorMessage: `Wallet balance ${balance}¢ is less than required ${request.amount.amountCents}¢`,
      };
    }

    try {
      const txId = await this.wallet.deduct(
        request.customerId,
        request.amount.amountCents,
        request.idempotencyKey,
      );
      return { status: 'SUCCESS', chargeId: txId };
    } catch (err) {
      return {
        status:       'TRANSIENT_FAILURE',
        errorCode:    'WALLET_DEDUCT_ERROR',
        errorMessage: String(err),
      };
    }
  }

  /**
   * Saga compensation: restore the wallet balance.
   * No external payment method is involved — purely in-house.
   */
  async compensate(
    _chargeId:  string,
    customerId: string,
    amount:     Money,
  ): Promise<CompensationResult> {
    try {
      await this.wallet.credit(customerId, amount.amountCents);
      return { status: 'SUCCESS' };
    } catch (err) {
      return { status: 'FAILED', reason: String(err) };
    }
  }
}
