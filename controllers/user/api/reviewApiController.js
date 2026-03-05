import reviewService from '../../../services/user/reviewService.js';

const reviewApiController = {
    // Add a new review
    async addReview(req, res, next) {
        try {
            const userId = req.user.id;
            const reviewData = req.body;

            const review = await reviewService.addReview(userId, reviewData);

            res.status(201).json({
                success: true,
                message: 'Review submitted successfully. It will be visible after approval.',
                data: review
            });

        } catch (error) {
            next(error);
        }
    },

    // Get reviews for a product
    async getProductReviews(req, res, next) {
        try {
            const { productId } = req.params;
            const reviewsData = await reviewService.getProductReviews(productId, req.query);

            res.status(200).json({
                success: true,
                data: reviewsData
            });

        } catch (error) {
            next(error);
        }
    },

    // Get user's reviews
    async getUserReviews(req, res, next) {
        try {
            const userId = req.user.id;
            const reviewsData = await reviewService.getUserReviews(userId, req.query);

            res.status(200).json({
                success: true,
                data: reviewsData
            });

        } catch (error) {
            next(error);
        }
    },

    // Update user's review
    async updateReview(req, res, next) {
        try {
            const { reviewId } = req.params;
            const userId = req.user.id;
            const updateData = req.body;

            const review = await reviewService.updateReview(userId, reviewId, updateData);

            res.status(200).json({
                success: true,
                message: 'Review updated successfully',
                data: review
            });

        } catch (error) {
            next(error);
        }
    },

    // Delete user's review
    async deleteReview(req, res, next) {
        try {
            const { reviewId } = req.params;
            const userId = req.user.id;

            const result = await reviewService.deleteReview(userId, reviewId);

            res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            next(error);
        }
    }
};

export default reviewApiController;
