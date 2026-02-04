import crypto from 'crypto';
import razorpayInstance from '../../config/razorpay.js';
import Order from '../../models/orderSchema.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { successResponse, errorResponse, STATUS } from '../../utils/response.js';


export const createRazorpayOrder = catchAsync(async (req, res, next) => {
    const { amount, orderId } = req.body;

    if (!amount || amount <= 0) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Invalid amount');
    }

    const options = {
        amount: Math.round(amount * 100), // Amount in paise
        currency: 'INR',
        receipt: `order_${orderId || Date.now()}`,
        payment_capture: 1 // Auto capture
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    return successResponse(res, STATUS.OK, 'Razorpay order created successfully', {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID
    });
});

// Verify Payment Signature
export const verifyPayment = catchAsync(async (req, res, next) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderId
    } = req.body;
    // Create expected signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');
    // Verify signature
    if (expectedSignature !== razorpay_signature) {
        // Payment failed - update order status
        await Order.findByIdAndUpdate(orderId, {
            paymentStatus: 'Failed',
            orderStatus: 'Payment Failed'
        });
        return errorResponse(res, STATUS.BAD_REQUEST, 'Payment verification failed');
    }
    // Payment successful - update order
    await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'Paid',
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        orderStatus: 'Processing'
    });
    return successResponse(res, STATUS.OK, 'Payment verified successfully', {
        paymentId: razorpay_payment_id
    });
});



// Handle Payment Failure
export const handlePaymentFailure = catchAsync(async (req, res, next) => {
    const { orderId, error } = req.body;
    await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'Failed',
        orderStatus: 'Payment Failed',
        paymentError: error?.description || 'Payment was cancelled or failed'
    });
    return successResponse(res, STATUS.OK, 'Payment failure recorded');
});
export default {
    createRazorpayOrder,
    verifyPayment,
    handlePaymentFailure
};
