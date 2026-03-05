import { catchAsync } from '../../../utils/catchAsync.js';
import { successResponse, errorResponse, STATUS } from '../../../utils/response.js';
import paymentService from '../../../services/user/paymentService.js';

export const createRazorpayOrder = catchAsync(async (req, res, next) => {
    const { amount, orderId } = req.body;

    try {
        const result = await paymentService.createRazorpayOrder(amount, orderId);
        return successResponse(res, STATUS.OK, 'Razorpay order created successfully', result);
    } catch (error) {
        return errorResponse(res, STATUS.BAD_REQUEST, error.message);
    }
});

// Verify Payment Signature
export const verifyPayment = catchAsync(async (req, res, next) => {
    try {
        const result = await paymentService.verifyPayment(req.body);
        return successResponse(res, STATUS.OK, 'Payment verified successfully', result);
    } catch (error) {
        return errorResponse(res, STATUS.BAD_REQUEST, error.message);
    }
});

// Handle Payment Failure
export const handlePaymentFailure = catchAsync(async (req, res, next) => {
    const { orderId, error } = req.body;
    await paymentService.handlePaymentFailure(orderId, error);
    return successResponse(res, STATUS.OK, 'Payment failure recorded');
});

export default {
    createRazorpayOrder,
    verifyPayment,
    handlePaymentFailure
};
