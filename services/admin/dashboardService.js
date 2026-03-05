import Order from "../../models/orderSchema.js";
import User from "../../models/userSchema.js";
import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";

function getDateRange(filter) {
    const now = new Date();
    let startDate, endDate = now;

    switch (filter) {
        case 'yearly':
            // Last 5 years
            startDate = new Date(now.getFullYear() - 4, 0, 1);
            break;
        case 'monthly':
            // Last 12 months
            startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            break;
        case 'weekly':
            // Last 8 weeks
            startDate = new Date(now.getTime() - (8 * 7 * 24 * 60 * 60 * 1000));
            break;
        case 'daily':
            // Last 30 days
            startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    return { startDate, endDate };
}

async function buildSalesChartData(filter) {
    const { startDate } = getDateRange(filter);
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let groupBy, sortBy, labels = [], salesData;

    switch (filter) {
        case 'yearly': {
            groupBy = {
                _id: { year: { $year: '$createdOn' } },
                total: { $sum: '$finalAmount' },
                count: { $sum: 1 }
            };

            salesData = await Order.aggregate([
                {
                    $match: {
                        createdOn: { $gte: startDate },
                        status: { $nin: ['Cancelled', 'Returned'] }
                    }
                },
                {
                    $group: {
                        _id: { year: { $year: '$createdOn' } },
                        total: { $sum: '$finalAmount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1 } }
            ]);

            // Build labels for last 5 years
            for (let i = 4; i >= 0; i--) {
                const year = now.getFullYear() - i;
                labels.push(year.toString());
            }

            const values = labels.map(label => {
                const found = salesData.find(d => d._id.year.toString() === label);
                return found ? found.total : 0;
            });

            return { labels, values };
        }

        case 'monthly': {
            salesData = await Order.aggregate([
                {
                    $match: {
                        createdOn: { $gte: startDate },
                        status: { $nin: ['Cancelled', 'Returned'] }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdOn' },
                            month: { $month: '$createdOn' }
                        },
                        total: { $sum: '$finalAmount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ]);

            for (let i = 11; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                labels.push(`${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`);
            }

            const values = [];
            for (let i = 11; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const found = salesData.find(
                    d => d._id.month === date.getMonth() + 1 && d._id.year === date.getFullYear()
                );
                values.push(found ? found.total : 0);
            }

            return { labels, values };
        }

        case 'weekly': {
            salesData = await Order.aggregate([
                {
                    $match: {
                        createdOn: { $gte: startDate },
                        status: { $nin: ['Cancelled', 'Returned'] }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $isoWeekYear: '$createdOn' },
                            week: { $isoWeek: '$createdOn' }
                        },
                        total: { $sum: '$finalAmount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.week': 1 } }
            ]);

            // Build labels for last 8 weeks
            for (let i = 7; i >= 0; i--) {
                const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
                const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
                labels.push(`${weekStart.getDate()} ${monthNames[weekStart.getMonth()]} - ${weekEnd.getDate()} ${monthNames[weekEnd.getMonth()]}`);
            }

            // Map data to labels (simplified - sum per week window)
            const values = [];
            for (let i = 7; i >= 0; i--) {
                const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
                weekStart.setHours(0, 0, 0, 0);
                const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));

                const weekOrders = await Order.aggregate([
                    {
                        $match: {
                            createdOn: { $gte: weekStart, $lt: weekEnd },
                            status: { $nin: ['Cancelled', 'Returned'] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$finalAmount' }
                        }
                    }
                ]);

                values.push(weekOrders.length > 0 ? weekOrders[0].total : 0);
            }

            return { labels, values };
        }

        case 'daily': {
            salesData = await Order.aggregate([
                {
                    $match: {
                        createdOn: { $gte: startDate },
                        status: { $nin: ['Cancelled', 'Returned'] }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdOn' },
                            month: { $month: '$createdOn' },
                            day: { $dayOfMonth: '$createdOn' }
                        },
                        total: { $sum: '$finalAmount' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]);

            // Build labels for last 30 days
            for (let i = 29; i >= 0; i--) {
                const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
                labels.push(`${date.getDate()} ${monthNames[date.getMonth()]}`);
            }

            const values = [];
            for (let i = 29; i >= 0; i--) {
                const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
                const found = salesData.find(
                    d => d._id.day === date.getDate() &&
                        d._id.month === date.getMonth() + 1 &&
                        d._id.year === date.getFullYear()
                );
                values.push(found ? found.total : 0);
            }

            return { labels, values };
        }

        default:
            return { labels: [], values: [] };
    }
}

const getBestSellingData = async (type) => {
    if (type === 'products') {
        const data = await Order.aggregate([
            { $match: { status: { $nin: ['Cancelled', 'Returned'] } } },
            { $unwind: '$orderedItems' },
            { $match: { 'orderedItems.itemStatus': { $nin: ['Cancelled', 'Returned'] } } },
            {
                $group: {
                    _id: '$orderedItems.product',
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $addFields: {
                    activeVariants: {
                        $filter: {
                            input: '$productInfo.variants',
                            as: 'v',
                            cond: { $eq: ['$$v.status', 'Active'] }
                        }
                    }
                }
            },
            {
                $project: {
                    productName: '$productInfo.productName',
                    productImage: {
                        $ifNull: [
                            { $arrayElemAt: [{ $arrayElemAt: ['$activeVariants.images', 0] }, 0] },
                            { $arrayElemAt: ['$productInfo.productImages', 0] }
                        ]
                    },
                    totalQuantity: 1,
                    totalRevenue: 1
                }
            }
        ]);
        return data;
    }

    if (type === 'categories') {
        const data = await Order.aggregate([
            { $match: { status: { $nin: ['Cancelled', 'Returned'] } } },
            { $unwind: '$orderedItems' },
            { $match: { 'orderedItems.itemStatus': { $nin: ['Cancelled', 'Returned'] } } },
            { $lookup: { from: 'products', localField: 'orderedItems.product', foreignField: '_id', as: 'productInfo' } },
            { $unwind: '$productInfo' },
            { $lookup: { from: 'categories', localField: 'productInfo.category', foreignField: '_id', as: 'categoryInfo' } },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: '$categoryInfo._id',
                    categoryName: { $first: '$categoryInfo.name' },
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);
        return data;
    }

    if (type === 'brands') {
        const data = await Order.aggregate([
            { $match: { status: { $nin: ['Cancelled', 'Returned'] } } },
            { $unwind: '$orderedItems' },
            { $match: { 'orderedItems.itemStatus': { $nin: ['Cancelled', 'Returned'] } } },
            { $lookup: { from: 'products', localField: 'orderedItems.product', foreignField: '_id', as: 'productInfo' } },
            { $unwind: '$productInfo' },
            { $lookup: { from: 'brands', localField: 'productInfo.brand', foreignField: '_id', as: 'brandInfo' } },
            { $unwind: '$brandInfo' },
            {
                $group: {
                    _id: '$brandInfo._id',
                    brandName: { $first: '$brandInfo.brandName' },
                    brandLogo: { $first: '$brandInfo.logo' },
                    totalQuantity: { $sum: '$orderedItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);
        return data;
    }

    throw new AppError('Invalid type. Use products, categories, or brands.', STATUS.BAD_REQUEST);
};

const generateLedgerBook = async (startDate, endDate) => {
    let dateFilter = {};
    if (startDate && endDate) {
        dateFilter = {
            createdOn: {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            }
        };
    }

    const orders = await Order.find(dateFilter)
        .populate('userId', 'name email')
        .populate('orderedItems.product', 'productName')
        .sort({ createdOn: 1 })
        .lean();

    let runningBalance = 0;
    const ledgerEntries = [];

    for (const order of orders) {
        const isRevenue = !['Cancelled', 'Returned'].includes(order.status);
        const amount = order.finalAmount;

        if (isRevenue) {
            runningBalance += amount;
            ledgerEntries.push({
                date: order.createdOn,
                orderId: order.orderId,
                description: `Order from ${order.userId?.name || 'Unknown'} - ${order.paymentMethod}`,
                debit: 0,
                credit: amount,
                balance: runningBalance,
                status: order.status,
                paymentStatus: order.paymentStatus
            });
        } else {
            runningBalance -= amount;
            ledgerEntries.push({
                date: order.createdOn,
                orderId: order.orderId,
                description: `${order.status} - Refund for Order`,
                debit: amount,
                credit: 0,
                balance: runningBalance,
                status: order.status,
                paymentStatus: order.paymentStatus
            });
        }
    }

    const totalCredit = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
    const totalDebit = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);

    return {
        entries: ledgerEntries,
        summary: {
            totalCredit,
            totalDebit,
            netBalance: totalCredit - totalDebit,
            totalEntries: ledgerEntries.length
        }
    };
};

const getDashboardPageData = async () => {
    // Get current date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // ===== TOTAL REVENUE =====
    const currentMonthOrders = await Order.find({
        createdOn: { $gte: startOfMonth },
        status: { $nin: ['Cancelled', 'Returned'] }
    });

    const lastMonthOrders = await Order.find({
        createdOn: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        status: { $nin: ['Cancelled', 'Returned'] }
    });

    const totalRevenue = currentMonthOrders.reduce((sum, order) => sum + order.finalAmount, 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.finalAmount, 0);
    const revenueChange = lastMonthRevenue > 0
        ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // ===== TOTAL ORDERS =====
    const totalOrders = currentMonthOrders.length;
    const lastMonthOrdersCount = lastMonthOrders.length;
    const ordersChange = lastMonthOrdersCount > 0
        ? ((totalOrders - lastMonthOrdersCount) / lastMonthOrdersCount) * 100
        : 0;

    // ===== ACTIVE USERS =====
    const activeUsers = await User.countDocuments({ isBlocked: false });
    const lastMonthUsers = await User.countDocuments({
        createdOn: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        isBlocked: false
    });
    const usersChange = lastMonthUsers > 0
        ? ((activeUsers - lastMonthUsers) / lastMonthUsers) * 100
        : 0;

    // ===== CONVERSION RATE =====
    const totalVisitors = activeUsers;
    const conversionRate = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0;
    const lastMonthConversionRate = lastMonthUsers > 0
        ? (lastMonthOrdersCount / lastMonthUsers) * 100
        : 0;
    const conversionChange = lastMonthConversionRate > 0
        ? ((conversionRate - lastMonthConversionRate) / lastMonthConversionRate) * 100
        : 0;

    // ===== SALES CHART DATA (Default: Monthly, Last 12 months) =====
    const salesChartData = await buildSalesChartData('monthly');

    // ===== CATEGORY CHART DATA =====
    const salesByCategory = await Order.aggregate([
        {
            $match: {
                createdOn: { $gte: startOfMonth },
                status: { $nin: ['Cancelled', 'Returned'] }
            }
        },
        { $unwind: '$orderedItems' },
        {
            $lookup: {
                from: 'products',
                localField: 'orderedItems.product',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        { $unwind: '$productInfo' },
        {
            $lookup: {
                from: 'categories',
                localField: 'productInfo.category',
                foreignField: '_id',
                as: 'categoryInfo'
            }
        },
        { $unwind: '$categoryInfo' },
        {
            $group: {
                _id: '$categoryInfo.name',
                total: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } }
            }
        },
        { $sort: { total: -1 } },
        { $limit: 5 }
    ]);

    const categoryChartData = {
        labels: salesByCategory.map(item => item._id),
        values: salesByCategory.map(item => item.total)
    };

    if (categoryChartData.labels.length === 0) {
        categoryChartData.labels = ['No Data'];
        categoryChartData.values = [0];
    }

    // ===== RECENT ORDERS =====
    const recentOrdersDb = await Order.find()
        .sort({ createdOn: -1 })
        .limit(5)
        .populate({
            path: 'address',
            select: 'fullName'
        })
        .populate({
            path: 'orderedItems.product',
            select: 'productName'
        })
        .lean();

    const recentOrders = recentOrdersDb.map(order => {
        const firstProduct = order.orderedItems[0];
        return {
            orderId: order.orderId,
            customerName: order.address?.fullName || 'Unknown',
            productName: firstProduct?.product?.productName || 'Unknown Product',
            finalAmount: order.finalAmount,
            status: order.status
        };
    });

    // ===== BEST SELLING =====
    const bestSellingProducts = await getBestSellingData('products');
    const bestSellingCategories = await getBestSellingData('categories');
    const bestSellingBrands = await getBestSellingData('brands');

    return {
        totalRevenue: Math.round(totalRevenue),
        revenueChange,
        totalOrders,
        ordersChange,
        activeUsers,
        usersChange,
        conversionRate,
        conversionChange,
        salesChartData,
        categoryChartData,
        recentOrders,
        bestSellingProducts,
        bestSellingCategories,
        bestSellingBrands
    };
};

export default {
    getDateRange,
    buildSalesChartData,
    getBestSellingData,
    generateLedgerBook,
    getDashboardPageData
};
