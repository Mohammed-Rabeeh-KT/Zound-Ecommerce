import mongoose from 'mongoose';
import Review from '../../models/reviewSchema.js';
import Product from '../../models/productSchema.js';
import Order from '../../models/orderSchema.js';
import AppError from '../../utils/AppError.js';
import { STATUS } from '../../utils/response.js';

const reviewService = {
    // Add a new review
    async addReview(userId, reviewData) {
        const { productId, rating, comment, variantId } = reviewData;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            throw new AppError('Product not found', STATUS.NOT_FOUND);
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
            comment,
            variantId: variantId || null
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
            product: productId
        })
            .populate('user', 'name profileImage')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Review.countDocuments({
            product: productId
        });

        // Get rating distribution
        const ratingStats = await Review.aggregate([
            { $match: { product: new mongoose.Types.ObjectId(productId) } },
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
            .populate('product', 'productName productImages variants slug')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .lean();

        // Enrich reviews with actual variant info from delivered orders
        const productIds = reviews
            .filter(r => r.product)
            .map(r => r.product._id);

        if (productIds.length > 0) {
            const deliveredOrders = await Order.find({
                userId: userId,
                status: 'Delivered',
                'orderedItems.product': { $in: productIds }
            }).select('orderedItems.product orderedItems.variantId').lean();

            for (const review of reviews) {
                if (!review.product) continue;
                // If review already has correct variantId, skip
                if (review.variantId) continue;

                // Find the delivered order item for this product
                for (const order of deliveredOrders) {
                    const matchingItem = order.orderedItems.find(
                        item => item.product && item.product.toString() === review.product._id.toString()
                    );
                    if (matchingItem && matchingItem.variantId) {
                        review.variantId = matchingItem.variantId;
                        break;
                    }
                }
            }
        }

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
                { $match: { product: new mongoose.Types.ObjectId(productId) } },
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

export default reviewService;
