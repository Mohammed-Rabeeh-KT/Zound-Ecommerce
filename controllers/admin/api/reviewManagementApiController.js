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

    // Approve review
    async approveReview(req, res, next) {
        try {
            const { id } = req.params;
            const review = await reviewManagementService.approveReview(id);

            res.status(200).json({
                success: true,
                message: 'Review approved successfully',
                data: review
            });

        } catch (error) {
            next(error);
        }
    },

    // Reject review
    async rejectReview(req, res, next) {
        try {
            const { id } = req.params;
            const review = await reviewManagementService.rejectReview(id);

            res.status(200).json({
                success: true,
                message: 'Review rejected successfully',
                data: review
            });

        } catch (error) {
            next(error);
        }
    },

    // Update review (admin can edit any review)
    async updateReview(req, res, next) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const review = await reviewManagementService.updateReview(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Review updated successfully',
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
    },

    // Bulk approve reviews
    async bulkApprove(req, res, next) {
        try {
            const { reviewIds } = req.body;
            const result = await reviewManagementService.bulkApprove(reviewIds);

            res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            next(error);
        }
    },

    // Bulk reject reviews
    async bulkReject(req, res, next) {
        try {
            const { reviewIds } = req.body;
            const result = await reviewManagementService.bulkReject(reviewIds);

            res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            next(error);
        }
    }
};

export default reviewManagementApiController;
