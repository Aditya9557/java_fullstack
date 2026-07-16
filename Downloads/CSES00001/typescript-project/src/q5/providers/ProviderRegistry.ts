import { IPaymentProvider } from './IPaymentProvider';

/**
 * Central registry for payment providers.
 *
 * **Finance team entry point** — to add a new payment method, implement
 * `IPaymentProvider` and call `registry.register(new MyProvider(...))` in
 * the application bootstrap. No payments-team review of the core is needed.
 */
export class ProviderRegistry {
  private readonly _providers = new Map<string, IPaymentProvider>();

  /** Register a provider. Throws if the id is already taken. */
  register(provider: IPaymentProvider): void {
    if (this._providers.has(provider.id)) {
      throw new Error(
        `Provider already registered: '${provider.id}'. Each provider must have a unique id.`,
      );
    }
    this._providers.set(provider.id, provider);
  }

  /** Retrieve a provider by id. Throws with a helpful message if unknown. */
  get(id: string): IPaymentProvider {
    const provider = this._providers.get(id);
    if (!provider) {
      throw new Error(
        `Unknown payment provider: '${id}'. Did you forget to register it in ProviderRegistry?`,
      );
    }
    return provider;
  }

  has(id: string): boolean {
    return this._providers.has(id);
  }

  getAll(): ReadonlyArray<IPaymentProvider> {
    return Array.from(this._providers.values());
  }
}
