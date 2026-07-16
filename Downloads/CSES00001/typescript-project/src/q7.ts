
export interface PaymentProvider {
    charge(amount: number, currency: string): PaymentResult;
    refund?(transactionId: string, amount: number): PaymentResult;
    partialCapture?(transactionId: string, amount: number): PaymentResult;
  }
  
  export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    error?: string;
  }

  export interface FraudCheck {
    run(order: Order): FraudCheckResult;
  }
  
  export interface FraudCheckResult {
    passed: boolean;
    reason?: string;
  }
  
  export interface Order {
    id: string;
    totalAmount: number;
    currency: string;
    items: OrderItem[];
    region: string;
  }
  
  export interface OrderItem {
    name: string;
    price: number;
    quantity: number;
  }
  
  export interface PaymentLeg {
    provider: PaymentProvider;
    amount: number;
    currency: string;
  }
  

  export class PaymentService {
    constructor(private fraudChecks: FraudCheck[]) {}
  
    processOrder(order: Order, paymentLegs: PaymentLeg[]): boolean {
      
      for (const check of this.fraudChecks) {
        const result = check.run(order);
        if (!result.passed) {
          console.log(`[FraudCheck] Order ${order.id} failed: ${result.reason}`);
          return false;
        }
      }
  
      
      const successfulPayments: PaymentLeg[] = [];
      for (const leg of paymentLegs) {
        const result = leg.provider.charge(leg.amount, leg.currency);
        if (result.success) {
          console.log(`[Payment] Charged $${leg.amount} via provider.`);
          successfulPayments.push(leg);
        } else {
          console.log(`[Payment] Failed to charge $${leg.amount}: ${result.error}`);
          this.rollbackPayments(successfulPayments);
          return false;
        }
      }
  
      console.log(`[Payment] Order ${order.id} processed successfully.`);
      return true;
    }
  
    private rollbackPayments(successfulPayments: PaymentLeg[]): void {
      for (const leg of successfulPayments) {
        if (leg.provider.refund) {
          console.log(`[Rollback] Refunding $${leg.amount} via provider.`);
          leg.provider.refund!(leg.provider.charge(leg.amount, leg.currency).transactionId!, leg.amount);
        } else {
          console.log(`[Rollback] Provider does not support refunds.`);
        }
      }
    }
  }
  
 
  export class StripeProvider implements PaymentProvider {
    charge(amount: number, currency: string): PaymentResult {
      console.log(`[Stripe] Charging $${amount} ${currency}`);
      return { success: true, transactionId: `stripe-${Date.now()}` };
    }
  
    refund(transactionId: string, amount: number): PaymentResult {
      console.log(`[Stripe] Refunding $${amount} for transaction ${transactionId}`);
      return { success: true };
    }
  }
  
  export class PayPalProvider implements PaymentProvider {
    charge(amount: number, currency: string): PaymentResult {
      console.log(`[PayPal] Charging $${amount} ${currency}`);
      return { success: true, transactionId: `paypal-${Date.now()}` };
    }
  
    partialCapture(transactionId: string, amount: number): PaymentResult {
      console.log(`[PayPal] Partially capturing $${amount} for transaction ${transactionId}`);
      return { success: true };
    }
  }
  
  export class StoreCreditProvider implements PaymentProvider {
    private balance: number;
  
    constructor(initialBalance: number) {
      this.balance = initialBalance;
    }
  
    charge(amount: number, currency: string): PaymentResult {
      if (this.balance >= amount) {
        this.balance -= amount;
        console.log(`[StoreCredit] Deducted $${amount}. Remaining balance: $${this.balance}`);
        return { success: true, transactionId: `storecredit-${Date.now()}` };
      } else {
        console.log(`[StoreCredit] Insufficient balance.`);
        return { success: false, error: "Insufficient balance" };
      }
    }
  }
  
  
  export class BasicFraudCheck implements FraudCheck {
    run(order: Order): FraudCheckResult {
      if (order.totalAmount > 1000) {
        return { passed: false, reason: "Order amount exceeds limit." };
      }
      return { passed: true };
    }
  }
  
  export class RegionFraudCheck implements FraudCheck {
    run(order: Order): FraudCheckResult {
      if (order.region === "EU" && !this.is3DSecureEnabled(order)) {
        return { passed: false, reason: "3-D Secure required for EU orders." };
      }
      return { passed: true };
    }
  
    private is3DSecureEnabled(_order: Order): boolean {
      
      return true;
    }
  }
  
 
  const order: Order = {
    id: "ORD123",
    totalAmount: 100,
    currency: "USD",
    items: [{ name: "Item1", price: 50, quantity: 2 }],
    region: "US",
  };
  
  const stripe = new StripeProvider();
  const paypal = new PayPalProvider();
  const storeCredit = new StoreCreditProvider(50);
  
  const fraudChecks = [new BasicFraudCheck(), new RegionFraudCheck()];
  const paymentService = new PaymentService(fraudChecks);
  
  const paymentLegs: PaymentLeg[] = [
    { provider: storeCredit, amount: 30, currency: "USD" },
    { provider: stripe, amount: 70, currency: "USD" },
  ];
  
  paymentService.processOrder(order, paymentLegs);
  
  ß
  void paypal;
