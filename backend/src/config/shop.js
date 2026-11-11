// Store rules. Money is in kobo (100 kobo = N1).

// Added to every order. 0 for now. For example 150000 would mean N1,500.
export const DELIVERY_FEE_KOBO = 0;

// How long a customer is asked to pay for an order. Until then its stock is reserved.
export const PAYMENT_WINDOW_MINUTES = 30;

// Extra time before an unpaid order is cancelled automatically, so a customer who is
// paying right at the deadline is not cancelled halfway through.
export const PAYMENT_GRACE_MINUTES = 10;

// Stops one customer from locking up stock with many unpaid orders.
export const MAX_UNPAID_ORDERS = 3;