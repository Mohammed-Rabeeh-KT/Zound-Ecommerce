import Order from '../../models/orderSchema.js';
import User from '../../models/userSchema.js';
import { catchAsync } from "../../utils/catchAsync.js";
import { successResponse, errorResponse, STATUS } from "../../utils/response.js";


const getOrderManagement = catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const { search, status } = req.query;
    let query = {};

    if (status && status !== '') {
        query.status = status;
    }

    if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i');

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
        .limit(limit);


    res.render('admin/orderManagement', {
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
            search: search || '',
            status: status || ''
        },
        currentPage: 'orders'
    });
})


const updateOrderStatus = catchAsync(async (req, res, next) => {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Order ID and Status are required');
    }

    const allowedStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

    if (!allowedStatuses.includes(status)) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Invalid Order status')
    }

    const order = await Order.findById(orderId);

    if (!order) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Order not found');
    }

    // Status transition rules
    const invalidTransitions = {
        Delivered: ['Pending', 'Processing', 'Shipped'],
        Cancelled: ['Pending', 'Processing', 'Shipped', 'Delivered']
    }

    if (invalidTransitions[order.status]?.includes(status)) {
        return errorResponse(res, STATUS.BAD_REQUEST, `Cannot change status from ${order.status} to ${status}`)
    }

    order.status = status;


    // COD payment handling
    if (status === 'Delivered' && order.paymentMethod === 'COD') {
        order.paymentStatus = 'Paid';
        order.paymentDetails = order.paymentDetails || {};
        order.paymentDetails.paymentStatus = 'Paid';
    }

    await order.save();

    return successResponse(res, STATUS.OK, 'Order status updated successfully')
})


const getOrderDetails = catchAsync(async (req, res, next) => {
    const { orderId } = req.params;

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
        return res.status(404).render('admin/error', { message: 'Order not found' });
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

    res.render('admin/orderDetails', {
        order,
        layout: 'adminLayout',
        currentPage: 'orders'
    });
})


// Handle return request (approve/reject)
const handleReturnRequest = catchAsync(async (req, res, next) => {
    const { orderId, itemId, action } = req.body;

    if (!orderId || !itemId || !action) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Order ID, Item ID and Action are required');
    }

    if (!['approve', 'reject'].includes(action)) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Invalid action. Must be approve or reject');
    }

    const order = await Order.findById(orderId);

    if (!order) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Order not found');
    }

    // Find the item in the order
    const itemIndex = order.orderedItems.findIndex(
        item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Item not found in order');
    }

    const item = order.orderedItems[itemIndex];

    if (item.itemStatus !== 'Return Requested') {
        return errorResponse(res, STATUS.BAD_REQUEST, 'This item does not have a pending return request');
    }

    if (action === 'approve') {
        // Approve return - change status to 'Returned'
        order.orderedItems[itemIndex].itemStatus = 'Returned';

        // Restore stock
        if (item.product) {
            const Product = (await import('../../models/productSchema.js')).default;

            if (item.variantId) {
                // Product with variant - restore variant stock
                await Product.updateOne(
                    { _id: item.product, 'variants._id': item.variantId },
                    { $inc: { 'variants.$.stock': item.quantity } }
                );
                console.log(`Stock restored: ${item.quantity} units added to variant ${item.variantId} of product ${item.product}`);
            } else {
                // Product without variant - restore main product stock
                await Product.updateOne(
                    { _id: item.product },
                    { $inc: { stock: item.quantity } }
                );
                console.log(`Stock restored: ${item.quantity} units added to product ${item.product}`);
            }
        }

        // TODO: Process refund to wallet if payment was made
        // This would involve adding the refund amount to user's wallet

    } else {
        // Reject return - change status back to 'Active' (delivered items)
        order.orderedItems[itemIndex].itemStatus = 'Active';
        order.orderedItems[itemIndex].returnReason = null;
    }

    // Check if all items are now returned
    const activeItems = order.orderedItems.filter(
        item => item.itemStatus !== 'Returned' && item.itemStatus !== 'Cancelled'
    );

    if (activeItems.length === 0) {
        order.status = 'Returned';
    } else {
        // If order was in Return Request status but not all items are returned
        const hasReturnRequested = order.orderedItems.some(item => item.itemStatus === 'Return Requested');
        if (!hasReturnRequested && order.status === 'Return Request') {
            order.status = 'Delivered';
        }
    }

    await order.save();

    const message = action === 'approve'
        ? 'Return request approved successfully'
        : 'Return request rejected';

    return successResponse(res, STATUS.OK, message);
});


// Update individual item status
const updateItemStatus = catchAsync(async (req, res, next) => {
    const { orderId, itemId, status } = req.body;

    if (!orderId || !itemId || !status) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Order ID, Item ID and Status are required');
    }

    const allowedStatuses = ['Active', 'Cancelled', 'Return Requested', 'Returned'];
    if (!allowedStatuses.includes(status)) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Invalid item status');
    }

    const order = await Order.findById(orderId);

    if (!order) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Order not found');
    }

    const itemIndex = order.orderedItems.findIndex(
        item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Item not found in order');
    }

    order.orderedItems[itemIndex].itemStatus = status;
    await order.save();

    return successResponse(res, STATUS.OK, 'Item status updated successfully');
});


export default {
    getOrderManagement,
    updateOrderStatus,
    getOrderDetails,
    handleReturnRequest,
    updateItemStatus
};
