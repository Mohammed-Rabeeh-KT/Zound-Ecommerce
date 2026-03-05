import { catchAsync } from "../../../utils/catchAsync.js";
import checkoutService from "../../../services/user/checkoutService.js";
import orderService from "../../../services/user/orderService.js";

const loadCheckout = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    try {
        const data = await checkoutService.getCheckoutData(userId);

        // Ensure there is a default address if possible
        let defaultAddress = data.addresses.find(addr => addr.isDefault);
        if (!defaultAddress && data.addresses.length > 0) {
            defaultAddress = data.addresses[0];
        }

        const cartSubtotal = data.cartTotal;
        const shippingCharge = cartSubtotal >= 500 ? 0 : 50;
        const finalTotal = cartSubtotal + shippingCharge;

        // Fetch available coupons
        const couponData = await checkoutService.getAvailableCoupons(userId);
        const availableCoupons = couponData.applicableCoupons.map(c => ({
            ...c,
            type: c.discountType,
            value: c.discountValue
        }));

        res.render('user/checkout', {
            layout: 'layout',
            user: data.user,
            walletBalance: data.user.wallet || 0,
            addresses: data.addresses,
            cart: data.cart,
            cartSubtotal: cartSubtotal,
            cartTotal: finalTotal,
            shippingCharge: shippingCharge,
            savings: data.savings,
            defaultAddress: defaultAddress || null,
            selectedAddress: defaultAddress ? defaultAddress._id : null,
            availableCoupons: availableCoupons
        });
    } catch (error) {
        if (error.message === 'Your cart is empty' || error.message.includes('out of stock')) {
            req.flash('error', error.message);
            return res.redirect('/user/cart');
        }
        res.redirect('/user/cart?error=checkout-failed');
    }
});

const orderConfirmation = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { orderId } = req.params;

    try {
        const data = await orderService.getOrderDetailsData(userId, orderId);

        res.render('user/orderConfirmation', {
            layout: 'layout',
            user: req.user || null,
            order: data.order
        });
    } catch (error) {
        res.redirect('/user/orders?message=Order not found');
    }
});

const getOrderDetails = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { orderId } = req.params;

    try {
        const data = await orderService.getOrderDetailsData(userId, orderId);

        res.render('user/orderDetails', {
            layout: 'layout',
            user: req.user || null,
            ...data
        });
    } catch (error) {
        return res.redirect('/user/orders?message=Order not found');
    }
});

const getOrders = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const status = req.query.status || 'all';

    try {
        const data = await orderService.getOrdersData(userId, page, status);

        res.render('user/orders', {
            layout: 'layout',
            user: req.user || null,
            orders: data.orders,
            currentPage: 'orders',
            searchQuery: '',
            status: status,
            pagination: data.pagination
        });
    } catch (error) {
        return res.redirect('/?message=Failed to load orders');
    }
});

export default {
    loadCheckout,
    orderConfirmation,
    getOrderDetails,
    getOrders
};