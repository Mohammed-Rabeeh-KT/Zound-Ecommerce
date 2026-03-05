import { catchAsync } from "../../../utils/catchAsync.js";
import reviewService from "../../../services/user/reviewService.js";

const getProductReviewsPage = catchAsync(async (req, res, next) => {
    const { productId } = req.params;
    const reviewsData = await reviewService.getProductReviews(productId, req.query);

    if (req.xhr) {
        return res.json({
            reviews: reviewsData.reviews,
            pagination: reviewsData.pagination,
            ratingDistribution: reviewsData.ratingDistribution
        });
    }

    res.render("user/productReviews", {
        reviews: reviewsData.reviews,
        pagination: reviewsData.pagination,
        ratingDistribution: reviewsData.ratingDistribution,
        productId
    });
});

const getUserReviewsPage = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const reviewsData = await reviewService.getUserReviews(userId, req.query);

    if (req.xhr) {
        return res.json({
            reviews: reviewsData.reviews,
            pagination: reviewsData.pagination
        });
    }

    res.render("user/myReviews", {
        reviews: reviewsData.reviews,
        pagination: reviewsData.pagination
    });
});

export {
    getProductReviewsPage,
    getUserReviewsPage
};
