import User from '../../models/userSchema.js';
import Order from '../../models/orderSchema.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import AppError from "../../utils/AppError.js";
import { catchAsync } from "../../utils/catchAsync.js";
import { successResponse, errorResponse, STATUS, MESSAGE } from "../../utils/response.js";

const loadDashboard = catchAsync(async (req, res, next) => {
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
        const totalVisitors = activeUsers; // You can replace this with actual visitor tracking
        const conversionRate = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0;
        const lastMonthConversionRate = lastMonthUsers > 0 
            ? (lastMonthOrdersCount / lastMonthUsers) * 100 
            : 0;
        const conversionChange = lastMonthConversionRate > 0 
            ? ((conversionRate - lastMonthConversionRate) / lastMonthConversionRate) * 100 
            : 0;

        // ===== SALES CHART DATA (Last 6 months) =====
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const salesByMonth = await Order.aggregate([
            {
                $match: {
                    createdOn: { $gte: sixMonthsAgo },
                    status: { $nin: ['Cancelled', 'Returned'] }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdOn' },
                        month: { $month: '$createdOn' }
                    },
                    total: { $sum: '$finalAmount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const salesChartData = {
            labels: [],
            values: []
        };

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthLabel = monthNames[date.getMonth()];
            salesChartData.labels.push(monthLabel);
            
            const monthData = salesByMonth.find(
                item => item._id.month === date.getMonth() + 1 && item._id.year === date.getFullYear()
            );
            salesChartData.values.push(monthData ? monthData.total : 0);
        }

        // ===== CATEGORY CHART DATA =====
        const salesByCategory = await Order.aggregate([
            {
                $match: {
                    createdOn: { $gte: startOfMonth },
                    status: { $nin: ['Cancelled', 'Returned'] }
                }
            },
            { $unwind: '$orderdItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderdItems.product',
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
                    total: { $sum: { $multiply: ['$orderdItems.quantity', '$orderdItems.price'] } }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 5 }
        ]);

        const categoryChartData = {
            labels: salesByCategory.map(item => item._id),
            values: salesByCategory.map(item => item.total)
        };

        // If no categories found, use default data
        if (categoryChartData.labels.length === 0) {
            categoryChartData.labels = ['Speakers', 'Headphones', 'Earbuds', 'Turntables', 'Accessories'];
            categoryChartData.values = [0, 0, 0, 0, 0];
        }

        // ===== RECENT ORDERS =====
        const recentOrders = await Order.find()
            .sort({ createdOn: -1 })
            .limit(5)
            .populate({
                path: 'address',
                select: 'name'
            })
            .populate({
                path: 'orderdItems.product',
                select: 'productName'
            })
            .lean();

        const formattedOrders = recentOrders.map(order => {
            const firstProduct = order.orderdItems[0];
            return {
                orderId: order.orderId,
                customerName: order.address?.name || 'Unknown',
                productName: firstProduct?.product?.productName || 'Unknown Product',
                finalAmount: order.finalAmount,
                status: order.status
            };
        });

        // ===== RENDER DASHBOARD =====
        res.render('admin/dashboard', {
            layout: 'adminLayout',
            currentPage: 'dashboard',
            adminName: req.session.admin?.name || 'Admin',
            adminEmail: req.session.admin?.email || 'admin@zound.com',
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
            recentOrders: formattedOrders
        });

})











export default {
    loadDashboard,
    
}