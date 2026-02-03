import mongoose from 'mongoose';
import Cart from '../../models/cartSchema.js';
import Address from '../../models/addressSchema.js';
import Order from '../../models/orderSchema.js';
import Product from '../../models/productSchema.js';
import User from '../../models/userSchema.js';
import offerController from '../admin/offerManagementController.js';
// import Coupon from '../../models/couponSchema.js';
import { catchAsync } from "../../utils/catchAsync.js";
import { errorResponse, successResponse, STATUS, MESSAGE } from "../../utils/response.js";




const loadCheckout = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user || user.isBlocked) {
        req.session.destroy();
        return res.redirect('/login?message=Your account has been blocked');
    }

    const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: [
            { path: 'brand', select: 'brandName isListed' },
            { path: 'category', select: 'name isListed' }
        ]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
        return res.redirect('/user/cart?message=Your cart is empty');
    }

    //Filter out invalid items
    const validItems = [];
    const invalidItems = [];

    for (let item of cart.items) {
        const product = item.productId;

        if (!product) {
            invalidItems.push({ reason: 'Product no longer exists', item })
            continue;
        }

        if (product.isDeleted || product.status !== 'Active') {
            invalidItems.push({ reason: 'Product is no longer available', item, productName: product.productName });
            continue;
        }

        if (product.brand && !product.brand.isListed) {
            invalidItems.push({ reason: 'Brand is no longer available', item, productName: product.productName });
            continue;
        }

        if (product.category && !product.category.isListed) {
            invalidItems.push({ reason: 'Category is currently unavailable', item, productName: product.productName });
            continue;
        }

        // Find the variant
        let variant = null;
        if (product.variants && item.variantId) {
            variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
        }

        // Fallback to first variant if specific variant not found
        if (!variant && product.variants && product.variants.length > 0) {
            variant = product.variants[0];
        }

        if (!variant) {
            invalidItems.push({ reason: 'Product variant not available', item, productName: product.productName });
            continue;
        }

        if (variant.status !== 'Active') {
            invalidItems.push({ reason: 'Product variant is no longer available', item, productName: product.productName })
            continue;
        }

        if (variant.stock < item.quantity) {
            if (variant.stock === 0) {
                invalidItems.push({ reason: 'Out of Stock', item, productName: product.productName });
                continue;
            } else {
                // Adjust quantity to available stock
                item.quantity = variant.stock;
                item.totalPrice = variant.salePrice * item.quantity;
            }
        }

        validItems.push({
            ...item.toObject(),
            variant,
            product
        });
    }

    //No valid items after filtering
    if (validItems.length === 0) {
        return res.redirect('/user/cart?message=No valid items in cart. Please review your cart.');
    }

    // Calculate offers for each valid item
    for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i];
        const product = item.product;
        const variant = item.variant;

        // Find variant index
        const variantIndex = product.variants.findIndex(v => v._id.toString() === variant._id.toString());

        // Calculate offer
        const offerData = await offerController.calculateOfferPrice(product, variantIndex >= 0 ? variantIndex : 0);

        validItems[i].offer = offerData;

        // Use offer price if available
        const effectivePrice = offerData.hasOffer ? offerData.offerPrice : variant.salePrice;
        validItems[i].effectivePrice = effectivePrice;
        validItems[i].effectiveTotalPrice = effectivePrice * item.quantity;
    }

    // Calculate cart subtotal using effective prices
    let cartSubtotal = 0;
    for (let item of validItems) {
        cartSubtotal += item.effectiveTotalPrice || (item.variant.salePrice * item.quantity);
    }

    // Shipping logic
    const FREE_SHIPPING_THRESHOLD = 500;
    const SHIPPING_CHARGE = 50;
    const shippingCharge = cartSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;


    //user addresses
    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

    const defaultAddress = addresses.find(address => address.isDefault);
    const selectedAddress = defaultAddress ? defaultAddress._id : (addresses.length > 0 ? addresses[0]._id : null);

    //wallet balance
    const walletBalance = user.wallet || 0;

    // Available coupons (empty for Phase 1 - COD only)
    const availableCoupons = [];

    const cartTotal = cartSubtotal + shippingCharge;



    res.render('user/checkout', {
        user: req.user || null,
        addresses,
        defaultAddress,
        selectedAddress,
        cart: { items: validItems },
        invalidItems,
        cartSubtotal,
        shippingCharge,
        cartTotal,
        walletBalance,
        availableCoupons
    })

})



// const applyCoupon = catchAsync(async (req, res, next) => {
//     const userId = req.user._id;
//     const { couponCode, cartSubTotal } = req.body;

//     if (!couponCode || !couponCode.trim()) {
//         return errorResponse(res, STATUS.BAD_REQUEST, 'Please enter a coupon code');
//     }

//     if (!cartSubtotal || cartSubtotal <= 0) {
//         return errorResponse(res, STATUS.BAD_REQUEST, 'Invalid cart total');
//     }

//     const coupon = await Coupon.findOne({
//         code: couponCode.toUpperCase().trim(),
//         isActive: true
//     });

//     if (!coupon) {
//         return errorResponse(res, STATUS.NOT_FOUND, 'Invalid coupon code')
//     }

//     // Check if coupon is expired
//     const now = new Date();
//     if (coupon.expiryDate < now) {
//         return errorResponse(res, STATUS.BAD_REQUEST, 'This coupon has expired');
//     }

//     // Check if coupon has started
//     if (coupon.startDate && coupon.startDate > now) {
//         return errorResponse(res, STATUS.BAD_REQUEST, 'This coupon is not yet active');
//     }

// // Check minimum purchase requirement
//     if (coupon.minPurchase && cartSubtotal < coupon.minPurchase) {
//         return errorResponse(res, STATUS.BAD_REQUEST, `Minimum purchase of ₹${coupon.minPurchase} required`);
//     }

//   // Check usage limit per user
//     if (coupon.usageLimitPerUser) {
//         const userUsageCount = coupon.usedBy.filter(id => id.toString() === userId.toString()).length;
//         if (userUsageCount >= coupon.usageLimitPerUser) {
//             return errorResponse(res, STATUS.BAD_REQUEST, 'You have already used this coupon');
//         }
//     }

//      // Check total usage limit
//     if (coupon.totalUsageLimit && coupon.usedCount >= coupon.totalUsageLimit) {
//         return errorResponse(res, STATUS.BAD_REQUEST, 'This coupon has reached its usage limit');
//     }

//         // Calculate discount
//     let discount = 0;
//     if (coupon.discountType === 'percentage') {
//         discountAmount = (cartSubtotal * coupon.discountValue) / 100;
//         // Apply max discount cap if exists
//         if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
//             discountAmount = coupon.maxDiscount;
//         }
//     } else {
//         discountAmount = coupon.discountValue;
//     }

// // Ensure discount doesn't exceed cart subtotal
//     if (discountAmount > cartSubtotal) {
//         discountAmount = cartSubtotal;
//     }

//     return successResponse(res, STATUS.OK, 'Coupon applied successfully', {
//         couponCode: coupon.code,
//         discountAmount: Math.round(discountAmount),
//         discountType: coupon.discountType,
//         discountValue: coupon.discountValue
//     });
// });


// const removeCoupon = catchAsync(async (req, res, next) => {
//     return successResponse(res, STATUS.OK, 'Coupon removed successfully', {
//         discountAmount: 0
//     });
// });




// // VALIDATE ORDER BEFORE PAYMENT
// const validateOrder = catchAsync(async(req,res,next) => {
//     const userId = req.user._id;
//     const {addressId , paymentMethod , couponCode , useWallet} = req.body;

//     const user = await User.findById(userId);
//     if(!user || user.isBlocked){
//         return errorResponse(res,STATUS.FORBIDDEN , 'Your account has been blocked');
//     }

//     if (!addressId) {
//         return errorResponse(res, STATUS.BAD_REQUEST, 'Please select a delivery address');
//     }

//      const address = await Address.findOne({ _id: addressId, userId });
//     if (!address) {
//         return errorResponse(res, STATUS.NOT_FOUND, 'Selected address not found');
//     }

//     const validPaymentMethods = ['cod', 'razorpay', 'wallet'];
//     if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
//         return errorResponse(res, STATUS.BAD_REQUEST, 'Please select a valid payment method');
//     }

//       // Get and validate cart
//     const cart = await Cart.findOne({ userId }).populate({
//         path: 'items.productId',
//         populate: [
//             { path: 'brand', select: 'brandName isBlocked' },
//             { path: 'category', select: 'name isListed' }
//         ]
//     });
//     if (!cart || !cart.items || cart.items.length === 0) {
//         return errorResponse(res, STATUS.BAD_REQUEST, 'Your cart is empty');
//     }

//         // Validate each cart item
//     const validationErrors = [];
//     let cartSubtotal = 0;

//     for(let item of cart.items){
//         const product = item.productId;

//       if (!product || product.isDeleted || product.status !== 'Active') {
//             validationErrors.push(`${product?.productName || 'A product'} is no longer available`);
//             continue;
//         }

//          if (product.brand?.isBlocked) {
//             validationErrors.push(`Brand for ${product.productName} is currently unavailable`);
//             continue;
//         }
//         if (product.category && !product.category.isListed) {
//             validationErrors.push(`Category for ${product.productName} is currently unavailable`);
//             continue;
//         }

//          let variant = null;
//         if (product.variants && item.variantId) {
//             variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
//         }

//         if (!variant && product.variants?.length > 0) {
//             variant = product.variants[0];
//         }

//         if (!variant || variant.status !== 'Active') {
//             validationErrors.push(`Variant for ${product.productName} is not available`);
//             continue;
//         }

//         if (variant.stock < item.quantity) {
//             if (variant.stock === 0) {
//                 validationErrors.push(`${product.productName} is out of stock`);
//             } else {
//                 validationErrors.push(`Only ${variant.stock} units of ${product.productName} available`);
//             }
//             continue;
//         }
//         cartSubtotal += variant.salePrice * item.quantity;
//     }

//     if (validationErrors.length > 0) {
//         return errorResponse(res, STATUS.BAD_REQUEST, 'Some items in your cart have issues', validationErrors);
//     }

//     const shippingCharge = cartSubtotal >= 500 ? 0 : 50;
//     let discount = 0;

//      if (couponCode) {
//         const couponResult = await validateCouponInternal(userId, couponCode, cartSubtotal);
//         if (!couponResult.valid) {
//             return errorResponse(res, STATUS.BAD_REQUEST, couponResult.message);
//         }
//         discount = couponResult.discountAmount;
//     }
//     // Calculate wallet usage
//     let walletDeduction = 0;
//     if (useWallet && user.wallet > 0) {
//         const totalAfterDiscount = cartSubtotal + shippingCharge - discount;
//         walletDeduction = Math.min(user.wallet, totalAfterDiscount);
//     }
//     const finalAmount = cartSubtotal + shippingCharge - discount - walletDeduction;

//      // COD restriction for high-value orders
//     if (paymentMethod === 'cod' && finalAmount > 1000) {
//         return errorResponse(res, STATUS.BAD_REQUEST, 'Cash on Delivery is not available for orders above ₹1000. Please choose online payment.');
//     }
//     // Full wallet payment check
//     if (paymentMethod === 'wallet' && user.wallet < (cartSubtotal + shippingCharge - discount)) {
//         return errorResponse(res, STATUS.BAD_REQUEST, 'Insufficient wallet balance');
//     }

//       return successResponse(res, STATUS.OK, 'Order validated successfully', {
//         cartSubtotal,
//         shippingCharge,
//         discount,
//         walletDeduction,
//         finalAmount
//     });
// })





// PLACE ORDER (COD ONLY) - Without Transactions (for standalone MongoDB)
const placeOrder = catchAsync(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { addressId } = req.body;

        // Validate user
        const user = await User.findById(userId);
        if (!user || user.isBlocked) {
            return errorResponse(res, STATUS.FORBIDDEN, 'Your account has been blocked');
        }

        // Validate address
        if (!addressId) {
            return errorResponse(res, STATUS.BAD_REQUEST, 'Please select a delivery address');
        }

        const address = await Address.findOne({ _id: addressId, userId });
        if (!address) {
            return errorResponse(res, STATUS.NOT_FOUND, 'Delivery address not found');
        }

        // Get cart
        const cart = await Cart.findOne({ userId }).populate({
            path: 'items.productId',
            populate: [
                { path: 'brand', select: 'brandName isListed' },
                { path: 'category', select: 'name isListed' }
            ]
        });

        if (!cart || !cart.items || cart.items.length === 0) {
            return errorResponse(res, STATUS.BAD_REQUEST, 'Your cart is empty');
        }

        // First pass: Validate all items before making any changes
        const itemsToProcess = [];
        let cartSubtotal = 0;

        for (let item of cart.items) {
            const product = await Product.findById(item.productId._id);

            // Validate product availability
            if (!product || product.isDeleted || product.status !== 'Active') {
                return errorResponse(res, STATUS.BAD_REQUEST, `${product?.productName || 'A product'} is no longer available`);
            }

            // Check brand
            if (item.productId.brand && !item.productId.brand.isListed) {
                return errorResponse(res, STATUS.BAD_REQUEST, `Brand for ${product.productName} is currently unavailable`);
            }

            // Check category
            if (item.productId.category && !item.productId.category.isListed) {
                return errorResponse(res, STATUS.BAD_REQUEST, `Category for ${product.productName} is currently unavailable`);
            }

            // Find variant index
            let variantIndex = -1;
            if (item.variantId) {
                variantIndex = product.variants.findIndex(v => v._id.toString() === item.variantId.toString());
            }
            if (variantIndex === -1 && product.variants.length > 0) {
                variantIndex = 0;
            }
            if (variantIndex === -1) {
                return errorResponse(res, STATUS.BAD_REQUEST, `Variant not found for ${product.productName}`);
            }

            const variant = product.variants[variantIndex];

            // Check variant status
            if (variant.status !== 'Active') {
                return errorResponse(res, STATUS.BAD_REQUEST, `Variant for ${product.productName} is not available`);
            }

            // Check stock
            if (variant.stock < item.quantity) {
                if (variant.stock === 0) {
                    return errorResponse(res, STATUS.BAD_REQUEST, `${product.productName} is out of stock`);
                }
                return errorResponse(res, STATUS.BAD_REQUEST, `Only ${variant.stock} units of ${product.productName} available`);
            }

            // Calculate offer price
            const offerData = await offerController.calculateOfferPrice(item.productId, variantIndex);
            const effectivePrice = offerData.hasOffer ? offerData.offerPrice : variant.salePrice;

            const itemPrice = effectivePrice * item.quantity;
            cartSubtotal += itemPrice;

            // Store for processing
            itemsToProcess.push({
                product,
                variantIndex,
                variant,
                quantity: item.quantity,
                price: effectivePrice,
                originalPrice: variant.salePrice,
                offer: offerData
            });
        }

        // Calculate shipping
        const shippingCharge = cartSubtotal >= 500 ? 0 : 50;
        const finalAmount = cartSubtotal + shippingCharge;

        // COD restriction check
        if (finalAmount > 100000) {
            return errorResponse(res, STATUS.BAD_REQUEST, 'Cash on Delivery is not available for orders above ₹100000');
        }

        // Second pass: Deduct stock (after all validations pass)
        const orderedItems = [];
        for (let item of itemsToProcess) {
            // Deduct stock using findOneAndUpdate for atomic operation
            await Product.findOneAndUpdate(
                {
                    _id: item.product._id,
                    [`variants.${item.variantIndex}.stock`]: { $gte: item.quantity }
                },
                {
                    $inc: { [`variants.${item.variantIndex}.stock`]: -item.quantity }
                }
            );

            orderedItems.push({
                product: item.product._id,
                variantId: item.variant._id,
                quantity: item.quantity,
                price: item.price
            });
        }

        // Create order
        const order = new Order({
            userId: userId,
            orderedItems: orderedItems,
            totalPrice: cartSubtotal,
            discount: 0,
            finalAmount: finalAmount,
            address: address._id,
            status: 'Pending',
            paymentMethod: 'COD',
            paymentStatus: 'Pending',
            couponApplied: false,
            invoiceDate: new Date()
        });

        await order.save();

        // Clear cart
        cart.items = [];
        await cart.save();

        return successResponse(res, STATUS.CREATED, 'Order placed successfully', {
            orderId: order._id,
            orderNumber: order.orderId
        });

    } catch (error) {
        console.error('Order placement error:', error);
        return errorResponse(res, STATUS.INTERNAL_ERROR, 'Failed to place order. Please try again.');
    }
});
// =====================================================
// ORDER CONFIRMATION PAGE
// =====================================================
const orderConfirmation = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { orderId } = req.params;
    // Validate order belongs to user
    const order = await Order.findOne({ _id: orderId, userId })
        .populate({
            path: 'orderedItems.product',
            select: 'productName productImages variants'
        })
        .populate('address');
    if (!order) {
        return res.redirect('/user/orders?message=Order not found');
    }
    res.render('user/orderConfirmation', {
        layout: 'layout',
        user: req.user || null,
        order
    });
});

// =====================================================
// ORDER DETAILS PAGE
// =====================================================
const getOrderDetails = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { orderId } = req.params;

    let order;

    // Check if it's a MongoDB ObjectId or custom orderId
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
        return res.redirect('/user/orders?message=Order not found');
    }

    // Calculate order timeline/progress
    const statusSteps = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    const currentStepIndex = statusSteps.indexOf(order.status);
    const isCancelled = order.status === 'Cancelled';
    const isReturned = order.status === 'Returned' || order.status === 'Return Request';

    res.render('user/orderDetails', {
        layout: 'layout',
        user: req.user || null,
        order,
        statusSteps,
        currentStepIndex,
        isCancelled,
        isReturned
    });
});

// =====================================================
// GET ALL ORDERS (Orders List Page)
// =====================================================
const getOrders = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const status = req.query.status || 'all';
    const limit = 10;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = { userId };
    if (status && status !== 'all') {
        filter.status = status;
    }

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limit);

    // Fetch orders with pagination
    const orders = await Order.find(filter)
        .sort({ createdOn: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
            path: 'orderedItems.product',
            select: 'productName productImages variants'
        });

    res.render('user/orders', {
        layout: 'layout',
        user: req.user || null,
        orders,
        currentPage: 'orders',
        searchQuery: '',
        status: status,
        pagination: {
            currentPage: page,
            totalPages,
            totalOrders,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    });
});


// =====================================================
// CANCEL ORDER ITEMS (Selective or Full Cancellation)
// =====================================================
const cancelOrderItems = catchAsync(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { orderId, itemIds, cancelAll, reason, description } = req.body;

        // Validate input
        if (!orderId) {
            return errorResponse(res, STATUS.BAD_REQUEST, 'Order ID is required');
        }

        if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
            return errorResponse(res, STATUS.BAD_REQUEST, 'Please select at least one item to cancel');
        }

        if (!reason) {
            return errorResponse(res, STATUS.BAD_REQUEST, 'Cancellation reason is required');
        }

        // Combine reason with description if provided
        const fullReason = description ? `${reason}: ${description}` : reason;

        // Find the order
        const order = await Order.findOne({ _id: orderId, userId }).populate({
            path: 'orderedItems.product',
            select: 'productName variants'
        });

        if (!order) {
            return errorResponse(res, STATUS.NOT_FOUND, 'Order not found');
        }

        // Check if order can be cancelled (only Pending or Processing orders)
        if (!['Pending', 'Processing'].includes(order.status)) {
            return errorResponse(res, STATUS.BAD_REQUEST, `Cannot cancel items from an order with status: ${order.status}`);
        }

        // Track cancellation details
        let cancelledItemsCount = 0;
        let totalRefundAmount = 0;
        const cancelledItemIds = [];

        // Process each item for cancellation
        for (const itemId of itemIds) {
            const itemIndex = order.orderedItems.findIndex(
                item => item._id.toString() === itemId
            );

            if (itemIndex === -1) {
                continue; // Skip if item not found
            }

            const item = order.orderedItems[itemIndex];

            // Skip if already cancelled
            if (item.itemStatus === 'Cancelled') {
                continue;
            }

            // Mark item as cancelled
            order.orderedItems[itemIndex].itemStatus = 'Cancelled';
            order.orderedItems[itemIndex].cancelReason = fullReason;

            // Restore stock
            if (item.product && item.variantId) {
                await Product.findOneAndUpdate(
                    { _id: item.product._id },
                    {
                        $inc: {
                            'variants.$[v].stock': item.quantity
                        }
                    },
                    {
                        arrayFilters: [{ 'v._id': item.variantId }]
                    }
                );
            }

            // Calculate refund amount
            totalRefundAmount += item.price * item.quantity;
            cancelledItemsCount++;
            cancelledItemIds.push(itemId);
        }

        if (cancelledItemsCount === 0) {
            return errorResponse(res, STATUS.BAD_REQUEST, 'No items were cancelled. Items may already be cancelled.');
        }

        // Check if all items are now cancelled
        const activeItems = order.orderedItems.filter(
            item => item.itemStatus !== 'Cancelled'
        );

        if (activeItems.length === 0 || cancelAll) {
            // All items cancelled - update order status
            order.status = 'Cancelled';
        }

        // Update order totals
        let newTotalPrice = 0;
        for (const item of order.orderedItems) {
            if (item.itemStatus !== 'Cancelled') {
                newTotalPrice += item.price * item.quantity;
            }
        }

        // Recalculate shipping
        const FREE_SHIPPING_THRESHOLD = 500;
        const SHIPPING_CHARGE = 50;
        const shippingCharge = newTotalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;

        // Update order amounts
        order.totalPrice = newTotalPrice;
        order.finalAmount = newTotalPrice > 0 ? newTotalPrice + shippingCharge : 0;

        await order.save();

        // Build response message
        let message = '';
        if (order.status === 'Cancelled') {
            message = 'Your order has been cancelled successfully.';
        } else {
            message = `${cancelledItemsCount} item${cancelledItemsCount > 1 ? 's' : ''} cancelled successfully.`;
        }

        return successResponse(res, STATUS.OK, message, {
            cancelledItems: cancelledItemsCount,
            cancelledItemIds,
            orderStatus: order.status,
            refundAmount: totalRefundAmount,
            newOrderTotal: order.finalAmount
        });

    } catch (error) {
        console.error('Cancel order items error:', error);
        return errorResponse(res, STATUS.INTERNAL_ERROR, 'Failed to cancel items. Please try again.');
    }
});




const returnOrderItems = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { orderId, itemIds, returnAll, reason, description } = req.body;

    if (!orderId) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Order ID is required');
    }

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Please select at least one item to return');
    }

    if (!reason) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Return reason is required');
    }

    const fullReason = description ? `${reason} : ${description}` : reason;

    const order = await Order.findOne({ _id: orderId, userId }).populate({
        path: 'orderedItems.product',
        select: 'productName variants'
    })

    if (!order) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Order not found');
    }

    // Check if order is delivered (only delivered orders can be returned)
    if (order.status !== 'Delivered') {
        return errorResponse(res, STATUS.BAD_REQUEST, `Cannot return items from an order with status: ${order.status}. Only delivered orders can be returned.`)
    }

    // Track return details
    let returnedItemsCount = 0;
    let totalRefundAmount = 0;
    const returnedItemIds = [];

    // Process each item for return
    for (const itemId of itemIds) {
        const itemIndex = order.orderedItems.findIndex(
            item => item._id.toString() === itemId
        )

        if (itemIndex === -1) {
            continue;
        }

        const item = order.orderedItems[itemIndex];

        if (item.itemStatus === 'Cancelled' || item.itemStatus === 'Returned' || item.itemStatus === 'Return Requested') {
            continue;
        }

        // Mark item as return requested
        order.orderedItems[itemIndex].itemStatus = 'Return Requested';
        order.orderedItems[itemIndex].returnReason = fullReason;

        // Calculate refund amount
        totalRefundAmount += item.price * item.quantity;
        returnedItemsCount++;
        returnedItemIds.push(itemId);
    }

    if (returnedItemsCount === 0) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'No items were processed for return. Items may already be cancelled or returned.');
    }

    // Check if all active items are now requesting return
    const activeItems = order.orderedItems.filter(
        item => item.itemStatus === 'Active'
    );

    if (activeItems.length === 0 || returnAll) {
        // All items requesting return - update order status
        order.status = 'Return Request';
    }

    await order.save();

    // Build response message
    let message = '';
    if (order.status === 'Return Request') {
        message = 'Your return request has been successfully submitted.';
    } else {
        message = `Return request submitted for ${returnedItemsCount} item${returnedItemsCount > 1 ? 's' : ''}.`;
    }

    return successResponse(res, STATUS.OK, message, {
        returnedItemsCount,
        returnedItemIds,
        orderStatus: order.status,
        refundAmount: totalRefundAmount,
        newOrderTotal: order.finalAmount
    })
})


// DOWNLOAD INVOICE (PDF)
const downloadInvoice = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { orderId } = req.params;
    let order;
    // Check if it's a MongoDB ObjectId or custom orderId
    if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findOne({ _id: orderId, userId })
            .populate({
                path: 'orderedItems.product',
                select: 'productName variants'
            })
            .populate('address')
            .populate('userId', 'name email phone');
    } else {
        order = await Order.findOne({ orderId: orderId, userId })
            .populate({
                path: 'orderedItems.product',
                select: 'productName variants'
            })
            .populate('address')
            .populate('userId', 'name email phone');
    }
    if (!order) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Order not found');
    }
    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(order);
    // Set response headers for HTML
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename=Invoice_${order.orderId}.html`);

    return res.send(invoiceHTML);
});
// Helper function to generate invoice HTML
function generateInvoiceHTML(order) {
    const orderDate = new Date(order.createdOn).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    let itemsHTML = '';
    let subtotal = 0;
    let itemNumber = 0; // Track actual item number for display

    order.orderedItems.forEach((item) => {
        // Skip cancelled and returned items completely from invoice
        if (item.itemStatus === 'Cancelled' || item.itemStatus === 'Returned') {
            return; // Skip this item
        }

        itemNumber++; // Increment only for active items
        const product = item.product;
        let variantValue = '';

        if (product && product.variants && item.variantId) {
            const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
            if (variant) {
                variantValue = variant.value || '';
            }
        }
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        // Determine item status label (only for active items now)
        let statusLabel = '';
        if (item.itemStatus === 'Return Requested') {
            statusLabel = '<br><small style="color: #b45309; font-weight: 600;">⏳ Return Requested</small>';
        }

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
        .items-table tr.cancelled td { opacity: 0.6; }
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
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-processing { background: #dbeafe; color: #1e40af; }
        .status-shipped { background: #e0e7ff; color: #3730a3; }
        .status-delivered { background: #d1fae5; color: #065f46; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        .status-return-request { background: #fef3c7; color: #b45309; }
        .status-returned { background: #fed7aa; color: #c2410c; }
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
                    <p><strong>Payment:</strong> Cash on Delivery</p>
                    <p><strong>Status:</strong> <span class="status-badge status-${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span></p>
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
            <p>For any queries, please contact our support team.<br>Email: support@zound.com | Phone: 1800-123-4567</p>
        </div>
    </div>
    <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="background: #002366; color: white; padding: 14px 32px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: 600;">
            🖨️ Print / Save as PDF
        </button>
    </div>
</body>
</html>
    `;
}



const searchOrders = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { query, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    let filter = { userId };

    if (query && query.trim()) {
        // Escape special regex characters to prevent creating invalid regular expressions
        const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedQuery, 'i');

        // Search by orderId or product name
        const productMatches = await Product.find({
            productName: searchRegex
        }).select('_id');

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

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return successResponse(res, STATUS.OK, 'Orders fetched successfully', {
            orders,
            pagination: {
                currentPage: page,
                totalPages,
                totalOrders,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        })
    }


    res.render('user/orders', {
        layout: 'layout',
        user: req.user || null,
        orders,
        currentPage: 'orders',
        searchQuery: query || '',
        status: status || 'all',
        pagination: {
            currentPage: page,
            totalPages,
            totalOrders,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    })
})




export default {
    loadCheckout,
    placeOrder,
    orderConfirmation,
    getOrderDetails,
    getOrders,
    cancelOrderItems,
    returnOrderItems,
    downloadInvoice,
    searchOrders
};