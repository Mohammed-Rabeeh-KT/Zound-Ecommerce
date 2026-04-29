import Order from "../../models/orderSchema.js";
import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import Coupon from "../../models/couponSchema.js";
import WalletTransaction from "../../models/walletTransactionSchema.js";
import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";
import {
    ORDER_STATUS, ORDER_STATUS_FLOW, ALL_ORDER_STATUSES,
    ITEM_STATUS, ALL_ITEM_STATUSES,
    PAYMENT_METHOD, ALL_PAYMENT_METHODS,
    PAYMENT_STATUS,
    WALLET_TRANSACTION_TYPE,
} from "../../utils/orderConstants.js";

const updateOrderStatus = async (orderId, status) => {
    if (!orderId || !status) {
        throw new AppError('Order ID and Status are required', STATUS.BAD_REQUEST);
    }

    const allowedStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED];

    if (!allowedStatuses.includes(status)) {
        throw new AppError('Invalid Order status', STATUS.BAD_REQUEST);
    }

    const order = await Order.findById(orderId);

    if (!order) {
        throw new AppError('Order not found', STATUS.NOT_FOUND);
    }

    if (order.status === ORDER_STATUS.DELIVERED && status === ORDER_STATUS.CANCELLED) {
        throw new AppError('Delivered orders cannot be cancelled. Customer can request a return instead.', STATUS.BAD_REQUEST);
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
        throw new AppError('Cancelled orders cannot be modified', STATUS.BAD_REQUEST);
    }

    if (order.status === ORDER_STATUS.RETURNED) {
        throw new AppError('Returned orders cannot be modified', STATUS.BAD_REQUEST);
    }

    const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
    const newIndex = ORDER_STATUS_FLOW.indexOf(status);

    if (currentIndex !== -1 && newIndex !== -1 && newIndex < currentIndex && status !== ORDER_STATUS.CANCELLED) {
        throw new AppError(`Cannot change status from ${order.status} to ${status}`, STATUS.BAD_REQUEST);
    }

    order.status = status;

    if (status === ORDER_STATUS.DELIVERED) {
        order.paymentStatus = PAYMENT_STATUS.PAID;
    }

    await order.save();
    return order;
};

const handleReturnRequest = async (orderId, itemId, action, rejectReason) => {
    if (!orderId || !itemId || !action) {
        throw new AppError('Order ID, Item ID and Action are required', STATUS.BAD_REQUEST);
    }

    if (!['approve', 'reject'].includes(action)) {
        throw new AppError('Invalid action. Must be approve or reject', STATUS.BAD_REQUEST);
    }

    const order = await Order.findById(orderId);

    if (!order) {
        throw new AppError('Order not found', STATUS.NOT_FOUND);
    }

    const itemIndex = order.orderedItems.findIndex(
        item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
        throw new AppError('Item not found in order', STATUS.NOT_FOUND);
    }

    const item = order.orderedItems[itemIndex];

    if (item.itemStatus !== ITEM_STATUS.RETURN_REQUESTED) {
        throw new AppError('This item does not have a pending return request', STATUS.BAD_REQUEST);
    }

    if (action === 'approve') {
        order.orderedItems[itemIndex].itemStatus = ITEM_STATUS.RETURNED;

        if (item.product) {
            const Product = (await import('../../models/productSchema.js')).default;

            if (item.variantId) {
                await Product.updateOne(
                    { _id: item.product, 'variants._id': item.variantId },
                    { $inc: { 'variants.$.stock': item.quantity } }
                );
            } else {
                await Product.updateOne(
                    { _id: item.product },
                    { $inc: { stock: item.quantity } }
                );
            }

            const refundAmount = (item.price * item.quantity) - (item.discountAllocated || 0);
            await User.findByIdAndUpdate(order.userId, {
                $inc: { wallet: refundAmount }
            });

            // Record refund in WalletTransaction collection
            await WalletTransaction.create({
                userId: order.userId,
                amount: refundAmount,
                type: WALLET_TRANSACTION_TYPE.CREDIT,
                description: `Refund for returned item - Order #${order.orderId}`,
                orderId: order._id,
                date: new Date()
            });
        }
    } else {
        order.orderedItems[itemIndex].itemStatus = ITEM_STATUS.RETURN_REJECTED;
        if (rejectReason) {
            order.orderedItems[itemIndex].returnRejectReason = rejectReason;
        }
    }

    const nonDeliverableItems = order.orderedItems.filter(
        item => item.itemStatus === ITEM_STATUS.RETURNED || item.itemStatus === ITEM_STATUS.CANCELLED
    );

    if (nonDeliverableItems.length === order.orderedItems.length) {
        const hasReturnedItems = order.orderedItems.some(item => item.itemStatus === ITEM_STATUS.RETURNED);
        order.status = hasReturnedItems ? ORDER_STATUS.RETURNED : ORDER_STATUS.CANCELLED;

        if (order.couponApplied) {
            try {
                const coupon = await Coupon.findOne({ code: order.couponApplied.toUpperCase() });
                if (coupon) {
                    coupon.usedCount = Math.max(0, coupon.usedCount - 1);
                    const userUsageIndex = coupon.usedBy.findIndex(
                        u => u.userId.toString() === order.userId.toString()
                    );
                    if (userUsageIndex >= 0) {
                        coupon.usedBy[userUsageIndex].usageCount -= 1;
                        if (coupon.usedBy[userUsageIndex].usageCount <= 0) {
                            coupon.usedBy.splice(userUsageIndex, 1);
                        }
                    }
                    await coupon.save();
                }
            } catch (err) {
                console.error('Error reversing coupon usage on return:', err);
            }
        }
    } else {
        const hasReturnRequested = order.orderedItems.some(item => item.itemStatus === ITEM_STATUS.RETURN_REQUESTED);
        if (!hasReturnRequested && order.status === ORDER_STATUS.RETURN_REQUEST) {
            order.status = ORDER_STATUS.DELIVERED;
            if (order.paymentStatus === PAYMENT_STATUS.PENDING) {
                order.paymentStatus = PAYMENT_STATUS.PAID;
            }
        }
    }

    await order.save();
    return action;
};

const updateItemStatus = async (orderId, itemId, status) => {
    if (!orderId || !itemId || !status) {
        throw new AppError('Order ID, Item ID and Status are required', STATUS.BAD_REQUEST);
    }

    const allowedStatuses = ALL_ITEM_STATUSES.filter(s => s !== ITEM_STATUS.DELIVERED);
    if (!allowedStatuses.includes(status)) {
        throw new AppError('Invalid item status', STATUS.BAD_REQUEST);
    }

     const allowedPayment = ALL_PAYMENT_METHODS;
    if (!allowedStatuses.includes(status)) {
        throw new AppError('Invalid item status', STATUS.BAD_REQUEST);
    }

    const order = await Order.findById(orderId);

    if (!order) {
        throw new AppError('Order not found', STATUS.NOT_FOUND);
    }

    const itemIndex = order.orderedItems.findIndex(
        item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
        throw new AppError('Item not found in order', STATUS.NOT_FOUND);
    }

    order.orderedItems[itemIndex].itemStatus = status;
    await order.save();

    return order;
};

const getOrderManagementPageData = async (pageQuery, searchQuery, statusQuery , paymentQuery , dateQuery) => {
    const page = parseInt(pageQuery) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let query = {};

    if (statusQuery && statusQuery !== '') {
        query.status = statusQuery;
    }

    if(paymentQuery && paymentQuery !== ''){
        query.paymentMethod = paymentQuery;
    }

    console.log(query)

    if (searchQuery && searchQuery.trim() !== '') {
        const searchRegex = new RegExp(searchQuery.trim(), 'i');

        const users = await User.find({
            $or: [
                { name: searchRegex },
                { email: searchRegex }
            ]
        }).select('id');

        const userIds = users.map(u => u._id);

        query.$or = [
            { orderId: searchRegex },
            { userId: { $in: userIds } }
        ];
    }

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
        .populate('userId', 'name email')
        .sort({ createdOn: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    return {
        orders,
        pagination: {
            currentPage: page,
            totalPages,
            totalOrders,
            limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        },
        filters: {
            search: searchQuery || '',
            status: statusQuery || '',
            paymentMethod: paymentQuery || '',
            date: dateQuery || ''
        }
    };
};

const getOrderDetailsPageData = async (orderId) => {
    const order = await Order.findById(orderId)
        .populate('userId')
        .populate({
            path: 'orderedItems.product',
            populate: [
                { path: 'brand', select: 'brandName' },
                { path: 'category', select: 'name' }
            ]
        })
        .populate('address')
        .lean();

    if (!order) {
        throw new AppError('Order not found', STATUS.NOT_FOUND);
    }

    // Process each ordered item to include variant-specific details
    if (order.orderedItems) {
        order.orderedItems = order.orderedItems.map(item => {
            let variantDetails = null;
            let variantImage = null;

            // Find the specific variant if variantId exists
            if (item.variantId && item.product && item.product.variants) {
                variantDetails = item.product.variants.find(
                    v => v._id.toString() === item.variantId.toString()
                );

                // Get variant-specific image or fallback to product images
                if (variantDetails && variantDetails.images && variantDetails.images.length > 0) {
                    variantImage = variantDetails.images[0];
                }
            }

            // Fallback to product's first image if no variant image
            if (!variantImage && item.product && item.product.productImages && item.product.productImages.length > 0) {
                variantImage = item.product.productImages[0];
            }

            return {
                ...item,
                variantDetails,
                displayImage: variantImage || '/images/placeholder.png'
            };
        });
    }

    return order;
};

export default {
    updateOrderStatus,
    handleReturnRequest,
    updateItemStatus,
    getOrderManagementPageData,
    getOrderDetailsPageData
};
