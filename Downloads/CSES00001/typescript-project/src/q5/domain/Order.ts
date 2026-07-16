import { Money }          from './Money';
import { PaymentLegSpec } from './PaymentLeg';
import { Region }         from './Region';

export type OrderId    = string;
export type CustomerId = string;

/**
 * An order ready to be checked out.
 *
 * - `region` determines which fraud checks the compliance team has registered.
 * - `totalAmount` must equal the sum of all `legs[*].amount`.
 * - `legs` specifies which provider handles each monetary slice.
 */
export interface Order {
  readonly orderId:     OrderId;
  readonly customerId:  CustomerId;
  readonly region:      Region;
  readonly totalAmount: Money;
  readonly legs:        readonly PaymentLegSpec[];
}
