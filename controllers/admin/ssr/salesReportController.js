import { catchAsync } from "../../../utils/catchAsync.js";

const getSalesReportPage = catchAsync(async (req, res) => {
    res.render("admin/salesReport", {
        currentPage: "sales",
        adminName: req.session.adminName
    });
});

export default {
    getSalesReportPage
};
