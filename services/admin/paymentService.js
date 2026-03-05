import Order from "../../models/orderSchema.js";
import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";

const getPaymentPageData = async (pageQuery) => {
    const page = parseInt(pageQuery) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalTransactions = await Order.countDocuments();

    const orders = await Order.find()
        .populate('userId', 'name email')
        .sort({ createdOn: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    // Calculate Revenue (Total of 'Paid' orders)
    const revenueAggregation = await Order.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } }
    ]);
    const revenue = revenueAggregation.length > 0 ? revenueAggregation[0].total : 0;

    // Calculate Refunds (Total of 'Returned' items)
    const refundAggregation = await Order.aggregate([
        { $unwind: "$orderedItems" },
        { $match: { "orderedItems.itemStatus": "Returned" } },
        {
            $group: {
                _id: null,
                total: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } }
            }
        }
    ]);
    const refunds = refundAggregation.length > 0 ? refundAggregation[0].total : 0;

    const totalPages = Math.ceil(totalTransactions / limit);

    return {
        orders,
        page,
        totalPages,
        totalTransactions,
        revenue,
        refunds
    };
};

const getRefundPageData = async (pageQuery, search, status, exportType) => {
    const page = parseInt(pageQuery) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Base Match Stage (Return Statuses Only)
    let baseMatch = {
        "orderedItems.itemStatus": { $in: ["Return Requested", "Returned", "Return Rejected"] }
    };

    // Apply Status Filter
    if (status) {
        if (status === 'pending') baseMatch["orderedItems.itemStatus"] = 'Return Requested';
        else if (status === 'processed') baseMatch["orderedItems.itemStatus"] = 'Returned';
        else if (status === 'rejected') baseMatch["orderedItems.itemStatus"] = 'Return Rejected';
    }

    // Build Pipeline
    const pipeline = [
        { $unwind: "$orderedItems" },
        { $match: baseMatch },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        // Sort by updated (most recent action)
        { $sort: { "updatedAt": -1 } }
    ];

    // Apply Search Filter (Order ID, User Name, Email)
    if (search) {
        const searchRegex = new RegExp(search, 'i');
        pipeline.push({
            $match: {
                $or: [
                    { "orderId": searchRegex },
                    { "user.name": searchRegex },
                    { "user.email": searchRegex }
                ]
            }
        });
    }

    // --- Export Logic (CSV) ---
    if (exportType === 'csv') {
        const allRefunds = await Order.aggregate(pipeline);

        let csv = "Refund ID,Order ID,Customer Name,Customer Email,Payment Method,Amount,Status,Date\n";
        allRefunds.forEach(ref => {
            const item = ref.orderedItems;
            const amount = (item.price * item.quantity).toFixed(2);
            const date = new Date(ref.updatedAt).toLocaleDateString('en-IN');
            const user = ref.user || {};
            const refundId = ref.orderId.split('-')[2] ? `REF-${ref.orderId.split('-')[2]}` : 'N/A';

            csv += `${refundId},${ref.orderId},"${user.name || 'Unknown'}","${user.email || ''}",${ref.paymentMethod},${amount},${item.itemStatus},${date}\n`;
        });

        return { isCsv: true, csvData: csv };
    }

    // --- Pagination & Data Fetching ---

    // Count total matching documents
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Order.aggregate(countPipeline);
    const totalRefundsCount = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalRefundsCount / limit);

    // Fetch paginated data
    const refundsItems = await Order.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit }
    ]);

    // --- Stats Calculation ---
    const statsPipeline = [
        { $unwind: "$orderedItems" },
        {
            $match: {
                "orderedItems.itemStatus": { $in: ["Return Requested", "Returned", "Return Rejected"] }
            }
        },
        {
            $group: {
                _id: "$orderedItems.itemStatus",
                count: { $sum: 1 },
                totalAmount: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } }
            }
        }
    ];
    const stats = await Order.aggregate(statsPipeline);

    let totalRefundAmount = 0;
    let pendingRefunds = 0;
    let processedRefunds = 0;

    stats.forEach(stat => {
        if (stat._id === 'Returned') {
            totalRefundAmount += stat.totalAmount;
            processedRefunds += stat.count;
        } else if (stat._id === 'Return Requested') {
            pendingRefunds += stat.count;
        }
    });

    return {
        isCsv: false,
        refunds: refundsItems,
        page,
        totalPages,
        search,
        status,
        totalRefundAmount,
        pendingRefunds,
        processedRefunds
    };
};

export default {
    getPaymentPageData,
    getRefundPageData
};
