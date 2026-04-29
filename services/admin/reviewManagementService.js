import Review from '../../models/reviewSchema.js';
import Product from '../../models/productSchema.js';
import User from '../../models/userSchema.js';
import AppError from '../../utils/AppError.js';
import { STATUS } from '../../utils/response.js';
import { ORDER_STATUS } from '../../utils/orderConstants.js';

const reviewManagementService = {
    // Get all reviews with filtering and pagination
    async getReviews(query = {}) {
        const {
            page = 1,
            limit = 10,
            rating,
            productId,
            userId,
            search
        } = query;

        // Build filter
        const filter = {};

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
                    status: ORDER_STATUS.DELIVERED,
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
        const totalReviews = await Review.countDocuments();

        const averageRating = await Review.aggregate([
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' }
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

        return {
            total: totalReviews,
            averageRating: averageRating[0]?.avgRating?.toFixed(1) || 0,
            ratingBreakdown: ratingStats
        };
    },

    // Helper function to update product rating
    async updateProductRating(productId) {
        try {
            const ratingStats = await Review.aggregate([
                { $match: { product: productId } },
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
