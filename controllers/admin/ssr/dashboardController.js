import { catchAsync } from "../../../utils/catchAsync.js";
import dashboardService from "../../../services/admin/dashboardService.js";

const loadDashboard = catchAsync(async (req, res, next) => {
    const data = await dashboardService.getDashboardPageData();

    res.render('admin/dashboard', {
        layout: 'adminLayout',
        currentPage: 'dashboard',
        adminName: req.session.admin?.name || 'Admin',
        adminEmail: req.session.admin?.email || 'admin@zound.com',
        ...data
    });
});

export default {
    loadDashboard
};