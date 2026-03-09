import { catchAsync } from "../../../utils/catchAsync.js";
import reviewService from "../../../services/user/reviewService.js";
import Product from "../../../models/productSchema.js";
import AppError from "../../../utils/AppError.js";
import { STATUS } from "../../../utils/response.js";

const getProductReviewsPage = catchAsync(async (req, res, next) => {
    const { slug } = req.params;

    // Find product by slug
    const product = await Product.findOne({ slug })
        .select('productName productImages slug averageRating reviewCount category variants')
        .populate('category', 'name slug')
        .lean();

    if (!product) {
        throw new AppError('Product not found', STATUS.NOT_FOUND);
    }

    const reviewsData = await reviewService.getProductReviews(product._id, req.query);

    if (req.xhr) {
        return res.json({
            reviews: reviewsData.reviews,
            pagination: reviewsData.pagination,
            ratingDistribution: reviewsData.ratingDistribution
        });
    }

    res.render("user/productReviews", {
        product,
        reviews: reviewsData.reviews,
        pagination: reviewsData.pagination,
        ratingDistribution: reviewsData.ratingDistribution
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
        pagination: reviewsData.pagination,
        user: req.user,
        currentPage: 'reviews'
    });
});

export {
    getProductReviewsPage,
    getUserReviewsPage
};
