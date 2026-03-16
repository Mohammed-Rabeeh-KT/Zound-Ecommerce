import reviewManagementService from '../../../services/admin/reviewManagementService.js';

const reviewManagementApiController = {
    // Get all reviews with filtering and pagination
    async getReviews(req, res, next) {
        try {
            const reviewsData = await reviewManagementService.getReviews(req.query);

            res.status(200).json({
                success: true,
                data: reviewsData
            });

        } catch (error) {
            next(error);
        }
    },

    // Get review by ID
    async getReviewById(req, res, next) {
        try {
            const { id } = req.params;
            const review = await reviewManagementService.getReviewById(id);

            res.status(200).json({
                success: true,
                data: review
            });

        } catch (error) {
            next(error);
        }
    },

    // Delete review
    async deleteReview(req, res, next) {
        try {
            const { id } = req.params;
            const result = await reviewManagementService.deleteReview(id);

            res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            next(error);
        }
    },

    // Get review statistics
    async getReviewStats(req, res, next) {
        try {
            const stats = await reviewManagementService.getReviewStats();

            res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            next(error);
        }
    }
};

export default reviewManagementApiController;
