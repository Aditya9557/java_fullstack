import { IPaymentProvider, CompensationResult } from '../providers/IPaymentProvider';
import { Money }                                from '../domain/Money';

export interface SagaEntry {
  readonly provider:   IPaymentProvider;
  readonly chargeId:   string;
  readonly customerId: string;
  readonly amount:     Money;
}

export interface CompensationRecord {
  readonly chargeId:   string;
  readonly providerId: string;
  readonly status:     'COMPENSATED' | 'FAILED' | 'MANUAL_REQUIRED';
  readonly reason?:    string;
}

/**
 * Append-only log of successful charge legs within a single checkout attempt.
 *
 * When a later leg fails, call `compensate()` to roll back all recorded legs
 * in **reverse order** (LIFO), mirroring the charge sequence.
 *
 * `compensate()` never throws — individual failures are recorded so that a
 * partial rollback is still surfaced rather than silently swallowed.
 */
export class SagaLog {
  private readonly entries: SagaEntry[] = [];

  record(entry: SagaEntry): void {
    this.entries.push(entry);
  }

  get size(): number {
    return this.entries.length;
  }

  /** Compensates all entries in reverse insertion order. */
  async compensate(): Promise<CompensationRecord[]> {
    const records: CompensationRecord[] = [];
    for (const entry of [...this.entries].reverse()) {
      records.push(await this.compensateOne(entry));
    }
    return records;
  }

  private async compensateOne(entry: SagaEntry): Promise<CompensationRecord> {
    const { provider, chargeId, customerId, amount } = entry;
    let result: CompensationResult;
    try {
      result = await provider.compensate(chargeId, customerId, amount);
    } catch (err) {
      return {
        chargeId,
        providerId: provider.id,
        status:     'FAILED',
        reason:     `compensate() threw: ${String(err)}`,
      };
    }

    const status: CompensationRecord['status'] =
      result.status === 'SUCCESS'         ? 'COMPENSATED'      :
      result.status === 'MANUAL_REQUIRED' ? 'MANUAL_REQUIRED'  :
                                            'FAILED';
    return { chargeId, providerId: provider.id, status, reason: result.reason };
  }
}
