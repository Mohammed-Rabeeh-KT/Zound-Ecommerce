import { catchAsync } from "../../../utils/catchAsync.js";
import { STATUS, successResponse, errorResponse } from "../../../utils/response.js";
import wishlistService from "../../../services/user/wishlistService.js";

// Add to wishlist
const addToWishlist = catchAsync(async (req, res, next) => {
    if (!req.user) return errorResponse(res, STATUS.UNAUTHORIZED, 'Please login to continue');
    const userId = req.user._id;
    const { productId, variantId } = req.body;

    try {
        const result = await wishlistService.addToWishlist(userId, productId, variantId);
        return successResponse(res, STATUS.OK, 'Added to wishlist', result);
    } catch (error) {
        return errorResponse(res, error.statusCode || STATUS.BAD_REQUEST, error.message);
    }
});

// Remove from wishlist
const removeFromWishlist = catchAsync(async (req, res, next) => {
    if (!req.user) return errorResponse(res, STATUS.UNAUTHORIZED, 'Please login to continue');
    const userId = req.user._id;
    const { productId } = req.params;
    const { variantId } = req.query;

    try {
        const result = await wishlistService.removeFromWishlist(userId, productId, variantId);
        return successResponse(res, STATUS.OK, 'Removed from wishlist', result);
    } catch (error) {
        return errorResponse(res, error.statusCode || STATUS.NOT_FOUND, error.message);
    }
});

// Clear wishlist
const clearWishlist = catchAsync(async (req, res, next) => {
    if (!req.user) return errorResponse(res, STATUS.UNAUTHORIZED, 'Please login to continue');
    const userId = req.user._id;

    try {
        await wishlistService.clearWishlist(userId);
        return successResponse(res, STATUS.OK, 'Wishlist cleared');
    } catch (error) {
        return errorResponse(res, error.statusCode || STATUS.INTERNAL_ERROR, error.message);
    }
});

// Move to cart
const moveToCart = catchAsync(async (req, res, next) => {
    if (!req.user) return errorResponse(res, STATUS.UNAUTHORIZED, 'Please login to continue');
    const userId = req.user._id;
    const { productId, variantId } = req.body;

    try {
        const result = await wishlistService.moveToCart(userId, productId, variantId);
        return successResponse(res, STATUS.OK, 'Moved to cart', result);
    } catch (error) {
        return errorResponse(res, error.statusCode || STATUS.BAD_REQUEST, error.message);
    }
});

// Get wishlist count
const getWishlistCount = catchAsync(async (req, res, next) => {
    if (!req.user) return successResponse(res, STATUS.OK, 'Wishlist count', { count: 0 });
    const userId = req.user._id;

    const count = await wishlistService.getWishlistCount(userId);
    return successResponse(res, STATUS.OK, 'Wishlist count', { count });
});

export default {
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    moveToCart,
    getWishlistCount
};
