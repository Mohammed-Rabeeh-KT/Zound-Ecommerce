import User from '../../models/userSchema.js';
import Address from '../../models/addressSchema.js';
import WalletTransaction from '../../models/walletTransactionSchema.js';
import mongoose from 'mongoose';
import Cart from '../../models/cartSchema.js';
import Order from '../../models/orderSchema.js';
import Product from '../../models/productSchema.js';
import Coupon from '../../models/couponSchema.js';
import AppError from '../../utils/AppError.js';
import { STATUS } from '../../utils/response.js';
import razorpayInstance from '../../config/razorpay.js';

// =====================================================
// HELPER FUNCTIONS FOR COUPONS
// =====================================================
const canUserUseCoupon = async (coupon, userId) => {
    // Check total usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return false;
    }

    // Check per-user limit
    if (coupon.perUserLimit) {
        const userUsage = coupon.usedBy.find(u => u.userId && u.userId.toString() === userId.toString());
        const useCount = userUsage ? userUsage.usageCount : 0;
        if (useCount >= coupon.perUserLimit) {
            return false;
        }
    }
    return true;
};

const calculateCouponDiscount = (cartTotal, coupon) => {
    if (coupon.discountType === 'percentage') {
        const discount = (cartTotal * coupon.discountValue) / 100;
        return coupon.maxDiscount ? Math.min(discount, coupon.maxDiscount) : discount;
    } else {
        return Math.min(coupon.discountValue, cartTotal);
    }
};

const isCouponValid = (coupon) => {
    const now = new Date();
    return (
        coupon.isActive &&
        new Date(coupon.startDate) <= now &&
        new Date(coupon.endDate) >= now
    );
};

const validateCouponInternal = async (code, cartTotal, userId) => {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) return { isValid: false, message: 'Invalid coupon code' };
    if (!isCouponValid(coupon)) return { isValid: false, message: 'Coupon is expired or inactive' };
    if (cartTotal < coupon.minPurchase) return { isValid: false, message: `Minimum purchase amount of ₹${coupon.minPurchase} required` };
    if (!(await canUserUseCoupon(coupon, userId))) return { isValid: false, message: 'You have reached the maximum usage limit for this coupon' };

    const discountAmount = calculateCouponDiscount(cartTotal, coupon);
    return { isValid: true, discountAmount, coupon };
};

const recordCouponUsage = async (couponId, userId, discountAmount = 0) => {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) return;

    const userIndex = coupon.usedBy.findIndex(u => u.userId.toString() === userId.toString());
    if (userIndex > -1) {
        coupon.usedBy[userIndex].usageCount += 1;
    } else {
        coupon.usedBy.push({ userId, usageCount: 1 });
    }

    coupon.usedCount += 1;
    coupon.totalSavings = (coupon.totalSavings || 0) + discountAmount;
    await coupon.save();
};

const reverseCouponUsage = async (couponIdentifier, userId, discountAmount = 0) => {
    let coupon;
    if (mongoose.Types.ObjectId.isValid(couponIdentifier)) {
        coupon = await Coupon.findById(couponIdentifier);
    } else {
        coupon = await Coupon.findOne({ code: couponIdentifier });
    }
    if (!coupon) return;

    const userIndex = coupon.usedBy.findIndex(u => u.userId.toString() === userId.toString());
    if (userIndex > -1) {
        if (coupon.usedBy[userIndex].usageCount > 1) {
            coupon.usedBy[userIndex].usageCount -= 1;
        } else {
            coupon.usedBy.splice(userIndex, 1);
        }
    }

    coupon.usedCount = Math.max(0, coupon.usedCount - 1);
    coupon.totalSavings = Math.max(0, (coupon.totalSavings || 0) - discountAmount);
    await coupon.save();
};

// =====================================================
// CHECKOUT SERVICES
// =====================================================
const getCheckoutData = async (userId) => {
    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
    const user = await User.findById(userId);

    const cartData = await import('./cartService.js').then(m => m.default.getCartData(userId));

    if (!cartData.cart || cartData.cart.items.length === 0) {
        throw new AppError('Your cart is empty', STATUS.BAD_REQUEST);
    }

    if (cartData.hasStockIssues || cartData.blockedItems.length > 0) {
        throw new AppError('Some items in your cart are out of stock or unavailable', STATUS.BAD_REQUEST);
    }

    return {
        addresses,
        user,
        cart: cartData.cart,
        cartTotal: cartData.cartTotal,
        savings: cartData.savings
    };
};

const applyCoupon = async (userId, code) => {
    const cartData = await import('./cartService.js').then(m => m.default.getCartData(userId));
    if (!cartData.cart || cartData.cart.items.length === 0) {
        throw new AppError('Your cart is empty', STATUS.BAD_REQUEST);
    }

    const validation = await validateCouponInternal(code, cartData.cartTotal, userId);

    if (!validation.isValid) {
        throw new AppError(validation.message, STATUS.BAD_REQUEST);
    }

    return {
        discountAmount: validation.discountAmount,
        newTotal: cartData.cartTotal - validation.discountAmount,
        message: 'Coupon applied successfully',
        couponCode: validation.coupon.code
    };
};

const getAvailableCoupons = async (userId) => {
    const cartData = await import('./cartService.js').then(m => m.default.getCartData(userId));
    const cartTotal = cartData.cartTotal || 0;

    const now = new Date();
    const allCoupons = await Coupon.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
    });

    const applicableCoupons = [];
    const unavailableCoupons = [];

    for (const coupon of allCoupons) {
        const canUse = await canUserUseCoupon(coupon, userId);
        const discountAmount = calculateCouponDiscount(cartTotal, coupon);

        const couponData = {
            _id: coupon._id,
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            minPurchase: coupon.minPurchase,
            maxDiscount: coupon.maxDiscount,
            endDate: coupon.endDate,
            discountAmount
        };

        if (cartTotal >= coupon.minPurchase && canUse) {
            applicableCoupons.push(couponData);
        } else {
            couponData.reason = !canUse ? 'Usage limit reached' : `Add ₹${(coupon.minPurchase - cartTotal).toFixed(2)} more to use this coupon`;
            unavailableCoupons.push(couponData);
        }
    }

    return { applicableCoupons, unavailableCoupons };
};

const validateOrder = async (userId, data) => {
    const { addressId, paymentMethod, couponCode } = data;

    if (!addressId) throw new AppError('Please select a delivery address', STATUS.BAD_REQUEST);
    if (!paymentMethod) throw new AppError('Please select a payment method', STATUS.BAD_REQUEST);

    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) throw new AppError('Selected address not found or deleted', STATUS.NOT_FOUND);

    const cartData = await import('./cartService.js').then(m => m.default.getCartData(userId));

    if (!cartData.cart || cartData.cart.items.length === 0) {
        throw new AppError('Your cart is empty', STATUS.BAD_REQUEST);
    }

    if (cartData.hasStockIssues || cartData.blockedItems.length > 0) {
        throw new AppError('Please adjust your cart before checkout', STATUS.BAD_REQUEST);
    }

    let finalAmount = cartData.cartTotal;
    let discount = 0;

    if (couponCode) {
        const validation = await validateCouponInternal(couponCode, cartData.cartTotal, userId);
        if (validation.isValid) {
            discount = validation.discountAmount;
            finalAmount -= discount;
        } else {
            throw new AppError(`Coupon Error: ${validation.message}`, STATUS.BAD_REQUEST);
        }
    }

    const FREE_SHIPPING_THRESHOLD = 500;
    const SHIPPING_CHARGE = 50;
    const shippingCharge = finalAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
    finalAmount += shippingCharge;

    const user = await User.findById(userId);
    if (paymentMethod === 'wallet' && user.wallet < finalAmount) {
        throw new AppError(`Insufficient wallet balance. You need ₹${finalAmount - user.wallet} more.`, STATUS.BAD_REQUEST);
    }

    if (paymentMethod === 'cod' && finalAmount > 1000) {
        throw new AppError('Cash on Delivery is not available for orders above ₹1000', STATUS.BAD_REQUEST);
    }

    return {
        valid: true,
        cartTotal: cartData.cartTotal,
        discount,
        shippingCharge,
        finalAmount,
        paymentMethod
    };
};

const placeOrder = async (userId, data) => {
    const { addressId, paymentMethod, couponCode, paymentDetails } = data;

    const validateResult = await validateOrder(userId, data);
    const { finalAmount, discount, cartTotal, shippingCharge } = validateResult;

    const cartData = await import('./cartService.js').then(m => m.default.getCartData(userId));
    const cart = cartData.cart;

    let totalAllocatedDiscount = 0;
    const orderedItems = cart.items.map((item, index) => {
        let itemDiscount = 0;
        if (discount > 0) {
            if (index === cart.items.length - 1) {
                itemDiscount = discount - totalAllocatedDiscount;
            } else {
                const itemTotal = item.effectivePrice * item.quantity;
                itemDiscount = (itemTotal / cartTotal) * discount;
                itemDiscount = Math.round(itemDiscount * 100) / 100;
                totalAllocatedDiscount += itemDiscount;
            }
        }

        return {
            product: item.productId._id,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.effectivePrice,
            productName: item.productId.productName,
            discountAllocated: itemDiscount,
            itemStatus: 'Active'
        };
    });

    let paymentStatus = 'Pending';
    if (paymentMethod === 'wallet') {
        paymentStatus = 'Paid';
    } else if (paymentMethod === 'razorpay') {
        if (data.paymentFailure) {
            throw new AppError('Payment failed. Order was not created.', STATUS.BAD_REQUEST);
        }
        paymentStatus = 'Paid';
    }

    let appliedCouponId = null;
    if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
        if (coupon) appliedCouponId = coupon._id;
    }

    // Deplete stock
    for (const item of cart.items) {
        const product = await Product.findById(item.productId._id);
        const variantIndex = product.variants.findIndex(v => v._id.toString() === item.variantId.toString());

        if (variantIndex !== -1) {
            product.variants[variantIndex].stock -= item.quantity;
            await product.save();
        }
    }

    const paymentMethodMap = {
        'cod': 'COD',
        'razorpay': 'Razorpay',
        'wallet': 'Wallet'
    };

    const order = new Order({
        userId: userId,
        orderedItems: orderedItems,
        totalPrice: cartTotal,
        discount: discount,
        finalAmount: finalAmount,
        address: addressId,
        status: 'Pending',
        paymentMethod: paymentMethodMap[paymentMethod] || 'COD',
        paymentStatus: paymentStatus,
        couponApplied: couponCode || null,
        invoiceDate: new Date(),
        ...(paymentMethod === 'razorpay' && paymentDetails ? {
            paymentId: paymentDetails.razorpay_payment_id || null,
            razorpayOrderId: paymentDetails.razorpay_order_id || null
        } : {})
    });

    if (paymentMethod === 'wallet') {
        try {
            await User.findByIdAndUpdate(userId, {
                $inc: { wallet: -finalAmount }
            });

            // Record wallet debit
            await WalletTransaction.create({
                userId,
                amount: finalAmount,
                type: 'Debit',
                description: `Payment for Order #${order.orderId}`,
                date: new Date()
            });

            await order.save();
        } catch (error) {
            console.error('Wallet transaction inner error:', error);
            throw new AppError('Wallet transaction failed. Try again.', STATUS.INTERNAL_SERVER_ERROR);
        }
    } else {
        await order.save();
    }

    if (appliedCouponId) {
        await recordCouponUsage(appliedCouponId, userId, discount);
    }

    // Clear cart
    await import('./cartService.js').then(m => m.default.clearCart(userId));

    return {
        orderId: order.orderId,
        orderNumber: order.orderId,
        finalAmount,
        paymentMethod: order.paymentMethod
    };
};

export default {
    getCheckoutData,
    applyCoupon,
    getAvailableCoupons,
    validateOrder,
    placeOrder,
    reverseCouponUsage
};
