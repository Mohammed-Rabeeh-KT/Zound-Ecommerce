import { catchAsync } from "../../../utils/catchAsync.js";


/* ===========================================================
   LOAD BRAND PAGE (EJS)
=========================================================== */
const getBrandPage = catchAsync(async (req, res) => {
    const { search = "", status = "" } = req.query;
    res.render("admin/brandManagement", {
        currentPage: "brands",
        adminName: req.session.admin?.name || "Admin",
        search,
        status
    });
});


export default {
    getBrandPage
};
