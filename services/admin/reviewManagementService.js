import Review from '../../models/reviewSchema.js';
import Product from '../../models/productSchema.js';
import User from '../../models/userSchema.js';
import AppError from '../../utils/AppError.js';
import { STATUS } from '../../utils/response.js';

const reviewManagementService = {
    // Get all reviews with filtering and pagination
    async getReviews(query = {}) {
        const {
            page = 1,
            limit = 10,
            status,
            rating,
            productId,
            userId,
            search
        } = query;

        // Build filter
        const filter = {};

        if (status) filter.status = status;
        if (rating) filter.rating = parseInt(rating);
        if (productId) filter.product = productId;
        if (userId) filter.user = userId;

        // Search by user name, product name, or comment
        if (search) {
            const users = await User.find({ name: { $regex: search, $options: 'i' } }).select('_id');
            const products = await Product.find({ productName: { $regex: search, $options: 'i' } }).select('_id');

            filter.$or = [
                { user: { $in: users.map(u => u._id) } },
                { product: { $in: products.map(p => p._id) } },
                { comment: { $regex: search, $options: 'i' } }
            ];
        }

        const reviews = await Review.find(filter)
            .populate('user', 'name email profile_picture')
            .populate('product', 'productName productImages variants slug')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        // Enrich reviews with variant image from delivered orders
        const Order = (await import('../../models/orderSchema.js')).default;
        for (const review of reviews) {
            if (!review.product) continue;
            let variantId = review.variantId;
            if (!variantId) {
                // Try to find the variant from the user's delivered order
                const order = await Order.findOne({
                    userId: review.user?._id,
                    status: 'Delivered',
                    'orderedItems.product': review.product._id
                }).select('orderedItems.product orderedItems.variantId').lean();
                if (order) {
                    const item = order.orderedItems.find(
                        i => i.product && i.product.toString() === review.product._id.toString()
                    );
                    if (item) variantId = item.variantId;
                }
            }
            // Resolve the variant image
            review.variantImage = null;
            if (variantId && review.product.variants && review.product.variants.length > 0) {
                const variant = review.product.variants.find(
                    v => v._id.toString() === variantId.toString()
                );
                if (variant && variant.images && variant.images.length > 0) {
                    review.variantImage = variant.images[0];
                }
            }
            if (!review.variantImage && review.product.productImages && review.product.productImages.length > 0) {
                review.variantImage = review.product.productImages[0];
            }
        }

        const total = await Review.countDocuments(filter);

        return {
            reviews,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        };
    },

    // Get review by ID
    async getReviewById(id) {
        const review = await Review.findById(id)
            .populate('user', 'name email profile_picture')
            .populate('product', 'productName productImages description');

        if (!review) {
            throw new AppError('Review not found', STATUS.NOT_FOUND);
        }

        return review;
    },

    // Approve review
    async approveReview(id) {
        const review = await Review.findById(id);
        if (!review) {
            throw new AppError('Review not found', STATUS.NOT_FOUND);
        }

        review.status = 'approved';
        await review.save();

        // Update product rating
        await this.updateProductRating(review.product);

        return review;
    },

    // Reject review
    async rejectReview(id) {
        const review = await Review.findById(id);
        if (!review) {
            throw new AppError('Review not found', STATUS.NOT_FOUND);
        }

        review.status = 'rejected';
        await review.save();

        // Update product rating
        await this.updateProductRating(review.product);

        return review;
    },

    // Update review (admin can edit any review)
    async updateReview(id, updateData) {
        const { rating, comment, status } = updateData;

        const review = await Review.findById(id);
        if (!review) {
            throw new AppError('Review not found', STATUS.NOT_FOUND);
        }

        if (rating !== undefined) review.rating = rating;
        if (comment !== undefined) review.comment = comment;
        if (status !== undefined) review.status = status;

        await review.save();

        // Update product rating if status changed to/from approved
        if (status === 'approved' || status === 'rejected') {
            await this.updateProductRating(review.product);
        }

        return review;
    },

    // Delete review
    async deleteReview(id) {
        const review = await Review.findById(id);
        if (!review) {
            throw new AppError('Review not found', STATUS.NOT_FOUND);
        }

        const productId = review.product;
        await Review.findByIdAndDelete(id);

        // Update product rating
        await this.updateProductRating(productId);

        return { message: 'Review deleted successfully' };
    },

    // Get review statistics
    async getReviewStats() {
        const stats = await Review.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const ratingStats = await Review.aggregate([
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalReviews = await Review.countDocuments();
        const approvedReviews = await Review.countDocuments({ status: 'approved' });
        const pendingReviews = await Review.countDocuments({ status: 'pending' });
        const rejectedReviews = await Review.countDocuments({ status: 'rejected' });

        const averageRating = await Review.aggregate([
            { $match: { status: 'approved' } },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' }
                }
            }
        ]);

        return {
            total: totalReviews,
            approved: approvedReviews,
            pending: pendingReviews,
            rejected: rejectedReviews,
            averageRating: averageRating[0]?.avgRating?.toFixed(1) || 0,
            statusBreakdown: stats,
            ratingBreakdown: ratingStats
        };
    },

    // Bulk approve reviews
    async bulkApprove(reviewIds) {
        if (!reviewIds || !Array.isArray(reviewIds)) {
            throw new AppError('Review IDs array is required', STATUS.BAD_REQUEST);
        }

        const result = await Review.updateMany(
            { _id: { $in: reviewIds } },
            { status: 'approved' }
        );

        // Update product ratings for affected products
        const reviews = await Review.find({ _id: { $in: reviewIds } });
        const productIds = [...new Set(reviews.map(r => r.product))];

        for (const productId of productIds) {
            await this.updateProductRating(productId);
        }

        return {
            message: `${result.modifiedCount} reviews approved successfully`,
            data: result
        };
    },

    // Bulk reject reviews
    async bulkReject(reviewIds) {
        if (!reviewIds || !Array.isArray(reviewIds)) {
            throw new AppError('Review IDs array is required', STATUS.BAD_REQUEST);
        }

        const result = await Review.updateMany(
            { _id: { $in: reviewIds } },
            { status: 'rejected' }
        );

        // Update product ratings for affected products
        const reviews = await Review.find({ _id: { $in: reviewIds } });
        const productIds = [...new Set(reviews.map(r => r.product))];

        for (const productId of productIds) {
            await this.updateProductRating(productId);
        }

        return {
            message: `${result.modifiedCount} reviews rejected successfully`,
            data: result
        };
    },

    // Helper function to update product rating
    async updateProductRating(productId) {
        try {
            const ratingStats = await Review.aggregate([
                { $match: { product: productId, status: 'approved' } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: '$rating' },
                        totalReviews: { $sum: 1 }
                    }
                }
            ]);

            const stats = ratingStats[0] || { averageRating: 0, totalReviews: 0 };

            await Product.findByIdAndUpdate(productId, {
                averageRating: Math.round(stats.averageRating * 10) / 10,
                reviewCount: stats.totalReviews
            });
        } catch (error) {
            console.error('Error updating product rating:', error);
        }
    }
};

export default reviewManagementService;
