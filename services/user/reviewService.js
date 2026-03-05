import Review from '../../models/reviewSchema.js';
import Product from '../../models/productSchema.js';
import Order from '../../models/orderSchema.js';
import AppError from '../../utils/AppError.js';
import { STATUS } from '../../utils/response.js';

const reviewService = {
    // Add a new review
    async addReview(userId, reviewData) {
        const { productId, rating, comment } = reviewData;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            throw new AppError('Product not found', STATUS.NOT_FOUND);
        }

        // Check if user has purchased the product
        const hasPurchased = await Order.findOne({
            user: userId,
            'items.product': productId,
            'orderStatus': 'Delivered'
        });

        if (!hasPurchased) {
            throw new AppError('You can only review products you have purchased', STATUS.FORBIDDEN);
        }

        // Check if user has already reviewed this product
        const existingReview = await Review.findOne({
            user: userId,
            product: productId
        });

        if (existingReview) {
            throw new AppError('You have already reviewed this product', STATUS.BAD_REQUEST);
        }

        // Create new review
        const review = new Review({
            user: userId,
            product: productId,
            rating,
            comment
        });

        await review.save();

        // Update product rating
        await this.updateProductRating(productId);

        return review;
    },

    // Get reviews for a product
    async getProductReviews(productId, query = {}) {
        const { page = 1, limit = 10 } = query;

        const reviews = await Review.find({
            product: productId,
            status: 'approved'
        })
        .populate('user', 'name profileImage')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

        const total = await Review.countDocuments({
            product: productId,
            status: 'approved'
        });

        // Get rating distribution
        const ratingStats = await Review.aggregate([
            { $match: { product: productId, status: 'approved' } },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            }
        ]);

        const ratingDistribution = {
            5: 0,
            4: 0,
            3: 0,
            2: 0,
            1: 0
        };

        ratingStats.forEach(stat => {
            ratingDistribution[stat._id] = stat.count;
        });

        return {
            reviews,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            },
            ratingDistribution
        };
    },

    // Get user's reviews
    async getUserReviews(userId, query = {}) {
        const { page = 1, limit = 10 } = query;

        const reviews = await Review.find({ user: userId })
            .populate('product', 'name productImage')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Review.countDocuments({ user: userId });

        return {
            reviews,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        };
    },

    // Update user's review
    async updateReview(userId, reviewId, updateData) {
        const { rating, comment } = updateData;

        const review = await Review.findOne({
            _id: reviewId,
            user: userId
        });

        if (!review) {
            throw new AppError('Review not found', STATUS.NOT_FOUND);
        }

        // Only allow updating pending reviews
        if (review.status !== 'pending') {
            throw new AppError('Cannot update approved or rejected reviews', STATUS.BAD_REQUEST);
        }

        review.rating = rating || review.rating;
        review.comment = comment || review.comment;

        await review.save();
        await this.updateProductRating(review.product);

        return review;
    },

    // Delete user's review
    async deleteReview(userId, reviewId) {
        const review = await Review.findOne({
            _id: reviewId,
            user: userId
        });

        if (!review) {
            throw new AppError('Review not found', STATUS.NOT_FOUND);
        }

        const productId = review.product;
        await Review.findByIdAndDelete(reviewId);

        // Update product rating
        await this.updateProductRating(productId);

        return { message: 'Review deleted successfully' };
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
                totalReviews: stats.totalReviews
            });
        } catch (error) {
            console.error('Error updating product rating:', error);
        }
    }
};

export default reviewService;
