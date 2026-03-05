import Order from '../../models/orderSchema.js';
import Product from '../../models/productSchema.js';
import User from '../../models/userSchema.js';
import WalletTransaction from '../../models/walletTransactionSchema.js';
import AppError from '../../utils/AppError.js';
import { STATUS } from '../../utils/response.js';
import mongoose from 'mongoose';
import checkoutService from './checkoutService.js';

const getOrdersData = async (userId, page = 1, status = 'all', limit = 10) => {
    const skip = (page - 1) * limit;
    let filter = { userId };
    if (status && status !== 'all') {
        filter.status = status;
    }

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(filter)
        .sort({ createdOn: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
            path: 'orderedItems.product',
            select: 'productName productImages variants'
        });

    return {
        orders,
        pagination: {
            currentPage: page,
            totalPages,
            totalOrders,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

const getOrderDetailsData = async (userId, orderId) => {
    let order;

    if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findOne({ _id: orderId, userId })
            .populate({
                path: 'orderedItems.product',
                select: 'productName productImages variants slug'
            })
            .populate('address');
    } else {
        order = await Order.findOne({ orderId: orderId, userId })
            .populate({
                path: 'orderedItems.product',
                select: 'productName productImages variants slug'
            })
            .populate('address');
    }

    if (!order) {
        throw new AppError('Order not found', STATUS.NOT_FOUND);
    }

    const statusSteps = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    const currentStepIndex = statusSteps.indexOf(order.status);
    const isCancelled = order.status === 'Cancelled';
    const isReturned = order.status === 'Returned' || order.status === 'Return Request';

    return { order, statusSteps, currentStepIndex, isCancelled, isReturned };
};

const cancelOrderItems = async (userId, data) => {
    const { orderId, itemIds, cancelAll, reason, description } = data;

    if (!orderId) throw new AppError('Order ID is required', STATUS.BAD_REQUEST);
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) throw new AppError('Please select at least one item to cancel', STATUS.BAD_REQUEST);
    if (!reason) throw new AppError('Cancellation reason is required', STATUS.BAD_REQUEST);

    const fullReason = description ? `${reason}: ${description}` : reason;

    const order = await Order.findOne({ _id: orderId, userId }).populate({
        path: 'orderedItems.product',
        select: 'productName variants'
    });

    if (!order) throw new AppError('Order not found', STATUS.NOT_FOUND);

    if (!['Pending', 'Processing'].includes(order.status)) {
        throw new AppError(`Cannot cancel items from an order with status: ${order.status}`, STATUS.BAD_REQUEST);
    }

    let cancelledItemsCount = 0;
    let totalRefundAmount = 0;
    const cancelledItemIds = [];

    for (const itemId of itemIds) {
        const itemIndex = order.orderedItems.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) continue;

        const item = order.orderedItems[itemIndex];
        if (item.itemStatus === 'Cancelled') continue;

        order.orderedItems[itemIndex].itemStatus = 'Cancelled';
        order.orderedItems[itemIndex].cancelReason = fullReason;

        if (item.product && item.variantId) {
            await Product.findOneAndUpdate(
                { _id: item.product._id },
                { $inc: { 'variants.$[v].stock': item.quantity } },
                { arrayFilters: [{ 'v._id': item.variantId }] }
            );
        }

        const refundAmount = (item.price * item.quantity) - (item.discountAllocated || 0);
        totalRefundAmount += refundAmount;
        cancelledItemsCount++;
        cancelledItemIds.push(itemId);
    }

    if (cancelledItemsCount === 0) {
        throw new AppError('No items were cancelled. Items may already be cancelled.', STATUS.BAD_REQUEST);
    }

    const activeItems = order.orderedItems.filter(item => item.itemStatus !== 'Cancelled');
    if (activeItems.length === 0 || cancelAll) {
        order.status = 'Cancelled';
        if (order.couponApplied && order.couponApplied !== 'false' && order.couponApplied !== 'null') {
            await checkoutService.reverseCouponUsage(order.couponApplied, userId, order.discount || 0);
        }
    }

    let newTotalPrice = 0;
    let totalDiscountRemaining = 0;

    for (const item of order.orderedItems) {
        if (item.itemStatus !== 'Cancelled') {
            newTotalPrice += item.price * item.quantity;
            totalDiscountRemaining += (item.discountAllocated || 0);
        }
    }

    order.discount = totalDiscountRemaining;

    const FREE_SHIPPING_THRESHOLD = 500;
    const SHIPPING_CHARGE = 50;
    const shippingCharge = newTotalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;

    order.totalPrice = newTotalPrice;
    order.finalAmount = newTotalPrice > 0 ? newTotalPrice + shippingCharge - totalDiscountRemaining : 0;

    await order.save();

    const shouldRefund = order.paymentStatus === 'Paid';
    if (shouldRefund && totalRefundAmount > 0) {
        await User.findByIdAndUpdate(userId, {
            $inc: { wallet: totalRefundAmount }
        });

        // Record refund in WalletTransaction collection
        await WalletTransaction.create({
            userId,
            amount: totalRefundAmount,
            type: 'Credit',
            description: `Refund for cancelled items - Order #${order.orderId}`,
            orderId: order._id,
            date: new Date()
        });
    }

    let message = order.status === 'Cancelled' ? 'Your order has been cancelled successfully.' : `${cancelledItemsCount} item${cancelledItemsCount > 1 ? 's' : ''} cancelled successfully.`;

    return {
        message,
        cancelledItems: cancelledItemsCount,
        cancelledItemIds,
        orderStatus: order.status,
        refundAmount: totalRefundAmount,
        newOrderTotal: order.finalAmount
    };
};

const returnOrderItems = async (userId, data) => {
    const { orderId, itemIds, returnAll, reason, description } = data;

    if (!orderId) throw new AppError('Order ID is required', STATUS.BAD_REQUEST);
    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) throw new AppError('Please select at least one item to return', STATUS.BAD_REQUEST);
    if (!reason) throw new AppError('Return reason is required', STATUS.BAD_REQUEST);

    const fullReason = description ? `${reason} : ${description}` : reason;

    const order = await Order.findOne({ _id: orderId, userId }).populate({
        path: 'orderedItems.product',
        select: 'productName variants'
    });

    if (!order) throw new AppError('Order not found', STATUS.NOT_FOUND);
    if (order.status !== 'Delivered') throw new AppError(`Cannot return items from an order with status: ${order.status}. Only delivered orders can be returned.`, STATUS.BAD_REQUEST);

    let returnedItemsCount = 0;
    let totalRefundAmount = 0;
    const returnedItemIds = [];

    for (const itemId of itemIds) {
        const itemIndex = order.orderedItems.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) continue;

        const item = order.orderedItems[itemIndex];
        if (item.itemStatus === 'Cancelled' || item.itemStatus === 'Returned' || item.itemStatus === 'Return Requested') continue;

        order.orderedItems[itemIndex].itemStatus = 'Return Requested';
        order.orderedItems[itemIndex].returnReason = fullReason;

        const refundAmount = (item.price * item.quantity) - (item.discountAllocated || 0);
        totalRefundAmount += refundAmount;
        returnedItemsCount++;
        returnedItemIds.push(itemId);
    }

    if (returnedItemsCount === 0) {
        throw new AppError('No items were processed for return. Items may already be cancelled or returned.', STATUS.BAD_REQUEST);
    }

    const activeItems = order.orderedItems.filter(item => item.itemStatus === 'Active');
    if (activeItems.length === 0 || returnAll) {
        order.status = 'Return Request';
    }

    await order.save();

    let message = order.status === 'Return Request' ? 'Your return request has been successfully submitted.' : `Return request submitted for ${returnedItemsCount} item${returnedItemsCount > 1 ? 's' : ''}.`;

    return {
        message,
        returnedItemsCount,
        returnedItemIds,
        orderStatus: order.status,
        refundAmount: totalRefundAmount,
        newOrderTotal: order.finalAmount
    };
};

const searchOrders = async (userId, query, status = 'all', page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    let filter = { userId };

    if (query && query.trim()) {
        const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedQuery, 'i');
        const productMatches = await Product.find({ productName: searchRegex }).select('_id');
        const productIds = productMatches.map(p => p._id);

        filter.$or = [
            { orderId: searchRegex },
            { 'orderedItems.product': { $in: productIds } }
        ];
    }

    if (status && status !== 'all') {
        filter.status = status;
    }

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(filter)
        .sort({ createdOn: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
            path: 'orderedItems.product',
            select: 'productName productImages variants'
        });

    return {
        orders,
        pagination: {
            currentPage: page,
            totalPages,
            totalOrders,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

const getInvoiceHTML = async (userId, orderId) => {
    let order;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findOne({ _id: orderId, userId })
            .populate({ path: 'orderedItems.product', select: 'productName variants' })
            .populate('address')
            .populate('userId', 'name email phone');
    } else {
        order = await Order.findOne({ orderId: orderId, userId })
            .populate({ path: 'orderedItems.product', select: 'productName variants' })
            .populate('address')
            .populate('userId', 'name email phone');
    }

    if (!order) {
        throw new AppError('Order not found', STATUS.NOT_FOUND);
    }

    return generateInvoiceHTMLString(order);
};

function getPaymentMethodLabel(paymentMethod) {
    const labels = {
        'cod': 'Cash on Delivery',
        'razorpay': 'Online Payment (Razorpay)',
        'wallet': 'Wallet Payment',
        'card': 'Card Payment',
        'upi': 'UPI Payment',
        'netbanking': 'Net Banking'
    };
    return labels[paymentMethod?.toLowerCase()] || paymentMethod || 'N/A';
}

function generateInvoiceHTMLString(order) {
    const orderDate = new Date(order.createdOn).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    let itemsHTML = '';
    let subtotal = 0;
    let itemNumber = 0;

    order.orderedItems.forEach((item) => {
        if (item.itemStatus === 'Cancelled' || item.itemStatus === 'Returned') return;

        itemNumber++;
        const product = item.product;
        let variantValue = '';
        if (product && product.variants && item.variantId) {
            const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
            if (variant) variantValue = variant.value || '';
        }

        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        let statusLabel = item.itemStatus === 'Return Requested' ? '<br><small style="color: #b45309; font-weight: 600;">⏳ Return Requested</small>' : '';

        itemsHTML += `
            <tr>
                <td>${itemNumber}</td>
                <td>
                    ${product ? product.productName : 'Product Unavailable'}
                    ${variantValue ? `<br><small style="color: #666;">${variantValue}</small>` : ''}
                    ${statusLabel}
                </td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">₹${item.price.toFixed(2)}</td>
                <td style="text-align: right;">₹${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    const shipping = order.finalAmount - order.totalPrice + order.discount;
    const shippingText = shipping > 0 ? `₹${shipping.toFixed(2)}` : 'FREE';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${order.orderId}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 40px; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden; }
        .invoice-header { background: linear-gradient(135deg, #002366 0%, #003399 100%); color: white; padding: 40px; display: flex; justify-content: space-between; align-items: flex-start; }
        .company-info h1 { font-size: 32px; font-weight: 800; letter-spacing: 2px; }
        .company-info p { opacity: 0.8; margin-top: 5px; }
        .invoice-title { text-align: right; }
        .invoice-title h2 { font-size: 28px; font-weight: 300; text-transform: uppercase; letter-spacing: 4px; }
        .invoice-title .invoice-number { font-size: 14px; margin-top: 10px; opacity: 0.9; }
        .invoice-body { padding: 40px; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 40px; }
        .info-section { flex: 1; }
        .info-section h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 10px; font-weight: 600; }
        .info-section p { font-size: 14px; line-height: 1.6; color: #333; }
        .info-section .highlight { font-weight: 600; color: #002366; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th { background: #f8fafc; padding: 14px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
        .items-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .totals-section { display: flex; justify-content: flex-end; }
        .totals-table { width: 300px; }
        .totals-table tr td { padding: 10px 16px; font-size: 14px; }
        .totals-table tr td:first-child { color: #64748b; }
        .totals-table tr td:last-child { text-align: right; font-weight: 500; }
        .totals-table tr.discount td:last-child { color: #10b981; }
        .totals-table tr.total { border-top: 2px solid #002366; }
        .totals-table tr.total td { padding-top: 16px; font-size: 18px; font-weight: 700; }
        .totals-table tr.total td:last-child { color: #002366; }
        .invoice-footer { background: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0; }
        .invoice-footer p { font-size: 13px; color: #64748b; line-height: 1.8; }
        .invoice-footer .thank-you { font-size: 16px; font-weight: 600; color: #002366; margin-bottom: 10px; }
        @media print {
            body { background: white; padding: 0; }
            .invoice-container { box-shadow: none; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="company-info">
                <h1>ZOUND</h1>
                <p>Premium Audio Experience</p>
            </div>
            <div class="invoice-title">
                <h2>Invoice</h2>
                <p class="invoice-number">${order.orderId}</p>
            </div>
        </div>
        <div class="invoice-body">
            <div class="invoice-info">
                <div class="info-section">
                    <h3>Bill To</h3>
                    <p class="highlight">${order.address?.fullName || 'N/A'}</p>
                    <p>${order.address?.addressLine1 || ''}</p>
                    ${order.address?.addressLine2 ? `<p>${order.address.addressLine2}</p>` : ''}
                    <p>${order.address?.city || ''}, ${order.address?.state || ''} - ${order.address?.pincode || ''}</p>
                    <p>Phone: ${order.address?.phone || 'N/A'}</p>
                </div>
                <div class="info-section">
                    <h3>Invoice Details</h3>
                    <p><strong>Order ID:</strong> ${order.orderId}</p>
                    <p><strong>Order Date:</strong> ${orderDate}</p>
                    <p><strong>Payment:</strong> ${getPaymentMethodLabel(order.paymentMethod)}</p>
                    <p><strong>Status:</strong> <span>${order.status}</span></p>
                </div>
            </div>
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 40px;">#</th>
                        <th>Item Description</th>
                        <th style="width: 80px; text-align: center;">Qty</th>
                        <th style="width: 100px; text-align: right;">Price</th>
                        <th style="width: 120px; text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>${itemsHTML}</tbody>
            </table>
            <div class="totals-section">
                <table class="totals-table">
                    <tr><td>Subtotal</td><td>₹${order.totalPrice.toFixed(2)}</td></tr>
                    ${order.discount > 0 ? `<tr class="discount"><td>Discount</td><td>-₹${order.discount.toFixed(2)}</td></tr>` : ''}
                    <tr><td>Shipping</td><td>${shippingText}</td></tr>
                    <tr class="total"><td>Total Amount</td><td>₹${order.finalAmount.toFixed(2)}</td></tr>
                </table>
            </div>
        </div>
        <div class="invoice-footer">
            <p class="thank-you">Thank you for shopping with ZOUND!</p>
            <p>For any queries, please contact our support team.<br>Email: support@zound.com</p>
        </div>
    </div>
    <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
</body>
</html>`;
}

export default {
    getOrdersData,
    getOrderDetailsData,
    cancelOrderItems,
    returnOrderItems,
    searchOrders,
    getInvoiceHTML
};
