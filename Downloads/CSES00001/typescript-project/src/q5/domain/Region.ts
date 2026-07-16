/**
 * Geographic region for an order.
 *
 * Compliance team uses this as the key in RegionCheckRegistry to register
 * region-specific fraud checks (e.g. EU requires 3-D Secure).
 */
export enum Region {
  US   = 'US',
  EU   = 'EU',
  UK   = 'UK',
  APAC = 'APAC',
}
