import { ChargeRequest, ChargeResult, IPaymentProvider } from '../providers/IPaymentProvider';
import { makeIdempotencyKey }                            from './IdempotencyKey';

export interface RetryOptions {
  /** Maximum number of attempts (including the first). */
  maxAttempts:     number;
  /** Base backoff in ms. Doubles each attempt (exponential backoff). */
  initialBackoffMs: number;
  /** Random jitter ceiling in ms added to backoff to prevent thundering herds. */
  jitterMs?:       number;
}

type SleepFn = (ms: number) => Promise<void>;

const defaultSleep: SleepFn = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Idempotency-aware charge executor with exponential back-off.
 *
 * Retry rules:
 *
 * | Result status       | Idempotent provider  | Non-idempotent provider        |
 * |---------------------|----------------------|--------------------------------|
 * | SUCCESS             | return immediately   | return immediately             |
 * | PERMANENT_FAILURE   | no retry             | no retry                       |
 * | TRANSIENT_FAILURE   | retry (same key)     | retry (new key per attempt)    |
 * | UNKNOWN_OUTCOME     | retry (same key)     | **ABORT** — double-charge risk |
 *
 * The `sleep` parameter defaults to `setTimeout` but can be overridden in
 * tests to a no-op, making all retry tests run instantly.
 */
export class ChargeWithRetry {
  constructor(private readonly options: RetryOptions) {}

  async execute(
    provider:    IPaymentProvider,
    baseRequest: Omit<ChargeRequest, 'idempotencyKey'>,
    sleep:       SleepFn = defaultSleep,
  ): Promise<ChargeResult> {
    const { maxAttempts, initialBackoffMs, jitterMs = 0 } = this.options;
    let lastResult: ChargeResult | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const idempotencyKey = makeIdempotencyKey(
        baseRequest.orderId,
        provider.id,
        attempt,
        provider.capabilities.isIdempotent,
      );

      const result = await provider.charge({ ...baseRequest, idempotencyKey });
      lastResult = result;

      switch (result.status) {
        case 'SUCCESS':
          return result;

        case 'PERMANENT_FAILURE':
          // Hard decline — never retry regardless of provider type.
          return result;

        case 'UNKNOWN_OUTCOME':
          if (!provider.capabilities.isIdempotent) {
            /**
             * We don't know whether the charge landed.
             * A blind retry could create a duplicate charge.
             * Abort and surface a specific error code so operations can investigate.
             */
            return {
              status:       'PERMANENT_FAILURE',
              errorCode:    'ABORT_NON_IDEMPOTENT_UNKNOWN_OUTCOME',
              errorMessage:
                `Provider '${provider.id}' is non-idempotent and returned ` +
                `UNKNOWN_OUTCOME on attempt ${attempt}. ` +
                `Retrying risks a double-charge — aborting. ` +
                `Investigate chargeId manually.`,
            };
          }
          // Idempotent: the stable key means the provider will return the same
          // result if the charge already landed. Safe to retry.
          break;

        case 'TRANSIENT_FAILURE':
          // Temporary error (rate-limit, 503) — safe to retry on all providers.
          break;
      }

      if (attempt < maxAttempts) {
        const backoff =
          initialBackoffMs * Math.pow(2, attempt - 1) +
          Math.random() * jitterMs;
        await sleep(backoff);
      }
    }

    return lastResult!;
  }
}
