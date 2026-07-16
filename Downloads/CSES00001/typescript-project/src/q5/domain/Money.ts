/**
 * Immutable monetary value. Amounts are stored as integer **cents** to avoid
 * floating-point drift (e.g. $10.99 → 1099 cents).
 *
 * Owned by the domain layer — no dependency on providers, fraud, or checkout.
 */
export class Money {
  private constructor(
    public readonly amountCents: number,
    public readonly currency: string,
  ) {}

  /** Factory. amountCents must be a non-negative integer. */
  static of(amountCents: number, currency = 'USD'): Money {
    if (!Number.isInteger(amountCents) || amountCents < 0) {
      throw new RangeError(
        `amountCents must be a non-negative integer, got: ${amountCents}`,
      );
    }
    return new Money(amountCents, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountCents + other.amountCents, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (other.amountCents > this.amountCents) {
      throw new RangeError(
        `Cannot subtract ${other} from ${this}: result would be negative`,
      );
    }
    return new Money(this.amountCents - other.amountCents, this.currency);
  }

  equals(other: Money): boolean {
    return (
      this.amountCents === other.amountCents &&
      this.currency === other.currency
    );
  }

  isZero(): boolean {
    return this.amountCents === 0;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountCents > other.amountCents;
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountCents < other.amountCents;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new TypeError(
        `Currency mismatch: ${this.currency} vs ${other.currency}`,
      );
    }
  }

  toString(): string {
    return `${(this.amountCents / 100).toFixed(2)} ${this.currency}`;
  }
}
