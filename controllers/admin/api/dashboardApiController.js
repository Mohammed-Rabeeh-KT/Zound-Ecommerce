import { catchAsync } from "../../../utils/catchAsync.js";
import { successResponse, errorResponse, STATUS } from "../../../utils/response.js";
import dashboardService from "../../../services/admin/dashboardService.js";

// =====================================================
// API: GET CHART DATA WITH FILTER
// =====================================================
const getDashboardChartData = catchAsync(async (req, res, next) => {
    const { filter } = req.query;
    const validFilters = ['yearly', 'monthly', 'weekly', 'daily'];

    if (!filter || !validFilters.includes(filter)) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Invalid filter. Use yearly, monthly, weekly, or daily.');
    }

    const salesChartData = await dashboardService.buildSalesChartData(filter);

    return successResponse(res, STATUS.OK, 'Chart data fetched successfully', {
        salesChartData
    });
});

// =====================================================
// API: GET BEST SELLING DATA (for AJAX if needed)
// =====================================================
const getBestSellingData = catchAsync(async (req, res, next) => {
    const { type } = req.query; // products, categories, brands

    const data = await dashboardService.getBestSellingData(type);
        return successResponse(res, STATUS.OK, `Best selling ${type}`, { data });
});

// =====================================================
// GENERATE LEDGER BOOK
// =====================================================
const generateLedgerBook = catchAsync(async (req, res, next) => {
    const { startDate, endDate } = req.query;

    const ledgerData = await dashboardService.generateLedgerBook(startDate, endDate);

    return successResponse(res, STATUS.OK, 'Ledger book generated', ledgerData);
});

export default {
    getDashboardChartData,
    getBestSellingData,
    generateLedgerBook
};
