/**
 * Order-related constants used across the application.
 * Centralizes all status and method enums to avoid hardcoded strings.
 */

// =====================================================
// ORDER STATUS
// =====================================================
export const ORDER_STATUS = Object.freeze({
    PENDING: 'Pending',
    PROCESSING: 'Processing',
    SHIPPED: 'Shipped',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
    RETURN_REQUEST: 'Return Request',
    RETURNED: 'Returned',
});

/** The forward progression of an order (used for validation). */
export const ORDER_STATUS_FLOW = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.PROCESSING,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.DELIVERED,
];

/** All valid order statuses. */
export const ALL_ORDER_STATUSES = Object.values(ORDER_STATUS);

// =====================================================
// ITEM STATUS (per ordered item)
// =====================================================
export const ITEM_STATUS = Object.freeze({
    ACTIVE: 'Active',
    CANCELLED: 'Cancelled',
    RETURN_REQUESTED: 'Return Requested',
    RETURNED: 'Returned',
    RETURN_REJECTED: 'Return Rejected',
    DELIVERED: 'Delivered',
});

/** All valid item statuses. */
export const ALL_ITEM_STATUSES = Object.values(ITEM_STATUS);

// =====================================================
// PAYMENT METHOD
// =====================================================
export const PAYMENT_METHOD = Object.freeze({
    COD: 'COD',
    RAZORPAY: 'Razorpay',
    WALLET: 'Wallet',
});

/** Maps lowercase frontend values to canonical payment method constants. */
export const PAYMENT_METHOD_MAP = Object.freeze({
    cod: PAYMENT_METHOD.COD,
    razorpay: PAYMENT_METHOD.RAZORPAY,
    wallet: PAYMENT_METHOD.WALLET,
});

/** All valid payment methods. */
export const ALL_PAYMENT_METHODS = Object.values(PAYMENT_METHOD);

// =====================================================
// PAYMENT STATUS
// =====================================================
export const PAYMENT_STATUS = Object.freeze({
    PENDING: 'Pending',
    PAID: 'Paid',
    FAILED: 'Failed',
    REFUNDED: 'Refunded',
});

/** All valid payment statuses. */
export const ALL_PAYMENT_STATUSES = Object.values(PAYMENT_STATUS);

// =====================================================
// WALLET TRANSACTION TYPE
// =====================================================
export const WALLET_TRANSACTION_TYPE = Object.freeze({
    CREDIT: 'Credit',
    DEBIT: 'Debit',
});
