import { describe, it, expect } from 'vitest';
import { Money } from '../../../q5/domain/Money';

describe('Money', () => {

  describe('of()', () => {
    it('creates a Money instance with the given cents and currency', () => {
      const m = Money.of(1099, 'USD');
      expect(m.amountCents).toBe(1099);
      expect(m.currency).toBe('USD');
    });

    it('defaults currency to USD', () => {
      expect(Money.of(500).currency).toBe('USD');
    });

    it('allows zero', () => {
      const m = Money.of(0);
      expect(m.isZero()).toBe(true);
    });

    it('throws RangeError for negative amount', () => {
      expect(() => Money.of(-1)).toThrow(RangeError);
    });

    it('throws RangeError for fractional amount', () => {
      expect(() => Money.of(1.5)).toThrow(RangeError);
    });
  });

  describe('add()', () => {
    it('sums two amounts in the same currency', () => {
      expect(Money.of(300).add(Money.of(700)).amountCents).toBe(1000);
    });

    it('throws TypeError on currency mismatch', () => {
      expect(() => Money.of(100, 'USD').add(Money.of(100, 'EUR'))).toThrow(TypeError);
    });
  });

  describe('subtract()', () => {
    it('subtracts correctly', () => {
      expect(Money.of(1000).subtract(Money.of(300)).amountCents).toBe(700);
    });

    it('allows subtracting to zero', () => {
      expect(Money.of(500).subtract(Money.of(500)).isZero()).toBe(true);
    });

    it('throws RangeError when result would be negative', () => {
      expect(() => Money.of(100).subtract(Money.of(200))).toThrow(RangeError);
    });

    it('throws TypeError on currency mismatch', () => {
      expect(() => Money.of(100, 'USD').subtract(Money.of(50, 'EUR'))).toThrow(TypeError);
    });
  });

  describe('equals()', () => {
    it('returns true for same amount and currency', () => {
      expect(Money.of(500, 'EUR').equals(Money.of(500, 'EUR'))).toBe(true);
    });

    it('returns false for different amounts', () => {
      expect(Money.of(500).equals(Money.of(501))).toBe(false);
    });

    it('returns false for different currencies', () => {
      expect(Money.of(500, 'USD').equals(Money.of(500, 'EUR'))).toBe(false);
    });
  });

  describe('isGreaterThan() / isLessThan()', () => {
    it('isGreaterThan returns true when left > right', () => {
      expect(Money.of(200).isGreaterThan(Money.of(100))).toBe(true);
    });

    it('isGreaterThan returns false when equal', () => {
      expect(Money.of(100).isGreaterThan(Money.of(100))).toBe(false);
    });

    it('isLessThan returns true when left < right', () => {
      expect(Money.of(50).isLessThan(Money.of(100))).toBe(true);
    });
  });

  describe('toString()', () => {
    it('formats cents as a decimal dollar amount', () => {
      expect(Money.of(1099, 'USD').toString()).toBe('10.99 USD');
    });

    it('pads zeros for whole-dollar amounts', () => {
      expect(Money.of(1000, 'GBP').toString()).toBe('10.00 GBP');
    });
  });

  describe('immutability', () => {
    it('add() does not mutate the original', () => {
      const a = Money.of(100);
      a.add(Money.of(50));
      expect(a.amountCents).toBe(100);
    });
  });
});
