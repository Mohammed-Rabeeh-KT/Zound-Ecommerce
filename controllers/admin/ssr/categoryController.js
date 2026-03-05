import Category from "../../../models/categorySchema.js";
import { catchAsync } from "../../../utils/catchAsync.js";


// LOAD PAGE
const getCategoryPage = catchAsync(async (req, res) => {
    const search = req.query.search || "";
    const status = req.query.status || "";

    return res.render("admin/categoryManagement", {
        currentPage: "categories",
        adminName: req.session.admin?.name || "",
        search,
        status,
    });
});


export default {
    getCategoryPage
}