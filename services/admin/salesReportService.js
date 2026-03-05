import Order from "../../models/orderSchema.js";
import Product from "../../models/productSchema.js";

const getSalesData = async (query) => {
    const { filter, startDate, endDate } = query;

    let dateFilter = {};
    const now = new Date();

    if (filter === 'daily') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        dateFilter = { $gte: startOfDay, $lte: endOfDay };
    } else if (filter === 'weekly') {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date();
        endOfWeek.setHours(23, 59, 59, 999);
        dateFilter = { $gte: startOfWeek, $lte: endOfWeek };
    } else if (filter === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        dateFilter = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (filter === 'yearly') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        startOfYear.setHours(0, 0, 0, 0);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        endOfYear.setHours(23, 59, 59, 999);
        dateFilter = { $gte: startOfYear, $lte: endOfYear };
    } else if (filter === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter = { $gte: start, $lte: end };
    }

    const matchStage = {
        createdOn: dateFilter,
        status: { $in: ['Delivered', 'Processing', 'Shipped', 'Pending'] }
    };

    const orders = await Order.find(matchStage)
        .populate('userId', 'name email')
        .populate({
            path: 'orderedItems.product',
            select: 'productName variants'
        })
        .select('orderId createdOn totalPrice discount finalAmount paymentMethod couponApplied status userId orderedItems')
        .sort({ createdOn: -1 })
        .lean();

    let salesCount = orders.length;
    let totalOrderAmount = 0;
    let totalCouponDeduction = 0;
    let totalOfferDiscount = 0;
    let netRevenue = 0;

    const formattedOrders = await Promise.all(orders.map(async (order) => {
        const couponDiscount = order.discount || 0;

        let originalTotalPrice = 0;
        let offerAppliedPrice = 0;

        for (const item of order.orderedItems) {
            if (item.product && item.product.variants) {
                const variant = item.product.variants.find(v =>
                    v._id.toString() === item.variantId?.toString()
                ) || item.product.variants[0];

                if (variant) {
                    originalTotalPrice += variant.salePrice * item.quantity;
                    offerAppliedPrice += item.price * item.quantity;
                }
            } else {
                offerAppliedPrice += item.price * item.quantity;
                originalTotalPrice += item.price * item.quantity;
            }
        }

        const offerDiscount = Math.max(0, originalTotalPrice - offerAppliedPrice);
        const totalUnits = order.orderedItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const productIds = order.orderedItems.map(item => item.product?._id?.toString()).filter(Boolean);

        totalOrderAmount += originalTotalPrice;
        totalOfferDiscount += offerDiscount;
        totalCouponDeduction += couponDiscount;
        netRevenue += order.finalAmount || 0;

        return {
            _id: order._id,
            orderId: order.orderId,
            createdOn: order.createdOn,
            customerName: order.userId?.name || 'Guest',
            totalPrice: originalTotalPrice,
            offerDiscount: offerDiscount,
            couponDiscount: couponDiscount,
            discount: offerDiscount + couponDiscount,
            finalAmount: order.finalAmount || 0,
            paymentMethod: order.paymentMethod,
            couponApplied: order.couponApplied,
            status: order.status,
            units: totalUnits,
            productIds: productIds
        };
    }));

    return {
        summary: {
            salesCount,
            totalOrderAmount: Math.round(totalOrderAmount),
            offerDiscount: Math.round(totalOfferDiscount),
            couponDeduction: Math.round(totalCouponDeduction),
            totalDiscount: Math.round(totalOfferDiscount + totalCouponDeduction),
            netRevenue: Math.round(netRevenue)
        },
        orders: formattedOrders
    };
};

const getProducts = async () => {
    return await Product.find({ isBlocked: false, isDeleted: false })
        .select('productName _id')
        .sort({ productName: 1 })
        .lean();
};

export default {
    getSalesData,
    getProducts
};
