/**
 * Generates a deterministic idempotency key for a charge attempt.
 *
 * Strategy depends on the provider's idempotency contract:
 *
 * **Idempotent provider** (e.g. Stripe): the key is fixed across all retries.
 * The provider recognises a replay and returns the original response without
 * charging again.
 *
 * **Non-idempotent provider** (e.g. PayPal): the key changes per attempt,
 * signalling a fresh request. This is used only for TRANSIENT failures (where
 * we know the first request did NOT complete). For UNKNOWN_OUTCOME we abort
 * entirely — see ChargeWithRetry.
 */
export function makeIdempotencyKey(
  orderId:    string,
  providerId: string,
  attempt:    number,
  idempotent: boolean,
): string {
  return idempotent
    ? `${orderId}:${providerId}`           // stable — provider deduplicates
    : `${orderId}:${providerId}:a${attempt}`; // changes per attempt
}
