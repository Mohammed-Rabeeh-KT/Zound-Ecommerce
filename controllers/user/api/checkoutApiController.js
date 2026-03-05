import { catchAsync } from "../../../utils/catchAsync.js";
import { STATUS, successResponse, errorResponse } from "../../../utils/response.js";
import checkoutService from "../../../services/user/checkoutService.js";
import orderService from "../../../services/user/orderService.js";

const applyCoupon = catchAsync(async (req, res, next) => {
    const { code } = req.body;
    const userId = req.user._id;

    if (!code) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Please provide a coupon code');
    }

    const result = await checkoutService.applyCoupon(userId, code);
    return successResponse(res, STATUS.OK, result.message, {
        discountAmount: result.discountAmount,
        newTotal: result.newTotal,
        couponCode: result.couponCode
    });
});

const removeCoupon = catchAsync(async (req, res, next) => {
    return successResponse(res, STATUS.OK, 'Coupon removed successfully');
});

const getAvailableCoupons = catchAsync(async (req, res, next) => {
    const coupons = await checkoutService.getAvailableCoupons(req.user._id);
    return successResponse(res, STATUS.OK, 'Coupons fetched', { coupons });
});

const validateOrder = catchAsync(async (req, res, next) => {
    const result = await checkoutService.validateOrder(req.user._id, req.body);
    return successResponse(res, STATUS.OK, 'Order validated successfully', result);
});

const placeOrder = catchAsync(async (req, res, next) => {
    const result = await checkoutService.placeOrder(req.user._id, req.body);
    return successResponse(res, STATUS.OK, 'Order placed successfully', result);
});

const cancelOrderItems = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const result = await orderService.cancelOrderItems(userId, req.body);
    return successResponse(res, STATUS.OK, result.message, {
        cancelledItems: result.cancelledItems,
        cancelledItemIds: result.cancelledItemIds,
        orderStatus: result.orderStatus,
        refundAmount: result.refundAmount,
        newOrderTotal: result.newOrderTotal
    });
});

const returnOrderItems = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const result = await orderService.returnOrderItems(userId, req.body);
    return successResponse(res, STATUS.OK, result.message, {
        returnedItemsCount: result.returnedItemsCount,
        returnedItemIds: result.returnedItemIds,
        orderStatus: result.orderStatus,
        refundAmount: result.refundAmount,
        newOrderTotal: result.newOrderTotal
    });
});

const downloadInvoice = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { orderId } = req.params;
    const invoiceHTML = await orderService.getInvoiceHTML(userId, orderId);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename=Invoice_${orderId}.html`);
    return res.send(invoiceHTML);
});

const searchOrders = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { query, status } = req.query;
    const page = parseInt(req.query.page) || 1;

    const data = await orderService.searchOrders(userId, query, status, page);

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return successResponse(res, STATUS.OK, 'Orders fetched successfully', data);
    }

    return res.render('user/orders', {
        layout: 'layout',
        user: req.user || null,
        orders: data.orders,
        currentPage: 'orders',
        searchQuery: query || '',
        status: status || 'all',
        pagination: data.pagination
    });
});

export default {
    applyCoupon,
    removeCoupon,
    getAvailableCoupons,
    validateOrder,
    placeOrder,
    cancelOrderItems,
    returnOrderItems,
    downloadInvoice,
    searchOrders
};
