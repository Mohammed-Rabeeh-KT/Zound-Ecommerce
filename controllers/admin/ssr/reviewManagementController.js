import { catchAsync } from "../../../utils/catchAsync.js";
import reviewManagementService from "../../../services/admin/reviewManagementService.js";

const getReviewManagementPage = catchAsync(async (req, res, next) => {
    const reviewsData = await reviewManagementService.getReviews(req.query);

    if (req.xhr) {
        return res.json({
            reviews: reviewsData.reviews,
            pagination: reviewsData.pagination
        });
    }

    res.render("admin/reviewManagement", {
        reviews: reviewsData.reviews,
        pagination: reviewsData.pagination,
        search: req.query.search || '',
        status: req.query.status || '',
        rating: req.query.rating || '',
        currentPage: 'reviews'
    });
});

const getReviewStats = catchAsync(async (req, res, next) => {
    const stats = await reviewManagementService.getReviewStats();
    
    res.json({
        success: true,
        data: stats
    });
});

export {
    getReviewManagementPage,
    getReviewStats
};
