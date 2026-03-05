import { catchAsync } from "../../../utils/catchAsync.js";
import homeService from "../../../services/user/homeService.js";

export const loadHomepage = catchAsync(async (req, res) => {

    const data = await homeService.getHomepageData();

    res.render("user/home", {
        layout: "layout",
        ...data
    });

});

export default {
    loadHomepage
};