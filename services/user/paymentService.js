import crypto from 'crypto';
import razorpayInstance from '../../config/razorpay.js';
import Order from '../../models/orderSchema.js';

const createRazorpayOrder = async (amount, orderId) => {
    if (!amount || amount <= 0) {
        throw new Error('Invalid amount');
    }

    const options = {
        amount: Math.round(amount * 100), // Amount in paise
        currency: 'INR',
        receipt: `order_${orderId || Date.now()}`,
        payment_capture: 1 // Auto capture
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    return {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID
    };
};

const verifyPayment = async (data) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        orderId
    } = data;

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
            status: 'Pending'
        });
        throw new Error('Payment verification failed');
    }

    // Payment successful - update order
    await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'Paid',
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        status: 'Processing'
    });

    const order = await Order.findById(orderId);
    if (order) {
        const module = await import('../../models/cartSchema.js');
        const Cart = module.default;
        await Cart.findOneAndUpdate({ userId: order.userId }, { items: [] });
    }

    return {
        paymentId: razorpay_payment_id
    };
};

const handlePaymentFailure = async (orderId, error) => {
    await Order.findByIdAndUpdate(orderId, {
        paymentStatus: 'Failed',
        status: 'Pending',
        paymentError: error?.description || 'Payment was cancelled or failed'
    });
    return true;
};

export default {
    createRazorpayOrder,
    verifyPayment,
    handlePaymentFailure
};
