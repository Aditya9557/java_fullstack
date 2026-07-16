import { describe, it, expect } from 'vitest';
import { ProviderRegistry } from '../../../q5/providers/ProviderRegistry';
import {
  IPaymentProvider,
  ProviderCapabilities,
  ChargeRequest,
  ChargeResult,
  CompensationResult,
} from '../../../q5/providers/IPaymentProvider';
import { Money } from '../../../q5/domain/Money';

// ── Fake helper ───────────────────────────────────────────────────────────────

function makeProvider(id: string): IPaymentProvider {
  const capabilities: ProviderCapabilities = {
    supportsRefunds:        true,
    supportsPartialCapture: false,
    supportsExternalCard:   true,
    isIdempotent:           true,
  };
  return {
    id,
    capabilities,
    async charge(_req: ChargeRequest): Promise<ChargeResult> {
      return { status: 'SUCCESS', chargeId: `${id}-charge` };
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

describe('ProviderRegistry', () => {
  it('registers a provider and retrieves it by id', () => {
    const registry = new ProviderRegistry();
    const provider = makeProvider('stripe');
    registry.register(provider);
    expect(registry.get('stripe')).toBe(provider);
  });

  it('throws when registering a duplicate id', () => {
    const registry = new ProviderRegistry();
    registry.register(makeProvider('stripe'));
    expect(() => registry.register(makeProvider('stripe'))).toThrow(
      /already registered/i,
    );
  });

  it('throws with a helpful message when getting an unknown provider', () => {
    const registry = new ProviderRegistry();
    expect(() => registry.get('unknown')).toThrow(
      /unknown payment provider/i,
    );
  });

  it('has() returns true for registered providers only', () => {
    const registry = new ProviderRegistry();
    registry.register(makeProvider('paypal'));
    expect(registry.has('paypal')).toBe(true);
    expect(registry.has('stripe')).toBe(false);
  });

  it('getAll() returns all registered providers', () => {
    const registry = new ProviderRegistry();
    registry.register(makeProvider('stripe'));
    registry.register(makeProvider('paypal'));
    registry.register(makeProvider('store-credit'));
    expect(registry.getAll()).toHaveLength(3);
  });

  it('finance team can add a new provider — zero payments-team code changes', () => {
    // This test documents the extensibility contract.
    // A third party (finance) creates their own provider and registers it.
    const myCustomProvider: IPaymentProvider = {
      id: 'acme-pay',
      capabilities: {
        supportsRefunds:        false,
        supportsPartialCapture: false,
        supportsExternalCard:   true,
        isIdempotent:           true,
      },
      async charge(_req: ChargeRequest): Promise<ChargeResult> {
        return { status: 'SUCCESS', chargeId: 'acme-charge-1' };
      },
      async compensate(
        _chargeId:   string,
        _customerId: string,
        _amount:     Money,
      ): Promise<CompensationResult> {
        return { status: 'MANUAL_REQUIRED', reason: 'AcmePay requires manual refund' };
      },
    };

    const registry = new ProviderRegistry();
    registry.register(myCustomProvider); // ← only thing finance team does

    expect(registry.get('acme-pay')).toBe(myCustomProvider);
    expect(registry.get('acme-pay').capabilities.supportsRefunds).toBe(false);
  });
});
