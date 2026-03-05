import { catchAsync } from "../../../utils/catchAsync.js";
import salesReportService from "../../../services/admin/salesReportService.js";

const getSalesData = catchAsync(async (req, res) => {
    const result = await salesReportService.getSalesData(req.query);
    res.json({
        success: true,
        summary: result.summary,
        orders: result.orders
    });
});

// Get products for filter dropdown
const getProducts = catchAsync(async (req, res) => {
    const products = await salesReportService.getProducts();
    res.json({
        success: true,
        products
    });
});

export default {
    getSalesData,
    getProducts
};
