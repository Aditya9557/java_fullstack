import { Money } from './Money';

/**
 * Specification for one leg of a (possibly split) payment.
 *
 * Example — $30 store credit + $70 card:
 *   [
 *     { providerId: 'store-credit', amount: Money.of(3000) },
 *     { providerId: 'stripe',       amount: Money.of(7000) },
 *   ]
 */
export interface PaymentLegSpec {
  readonly providerId: string;
  readonly amount:     Money;
  /** Arbitrary pass-through data forwarded to the provider (e.g. card token). */
  readonly metadata?:  Readonly<Record<string, unknown>>;
}
