import { catchAsync } from "../../../utils/catchAsync.js";
import { STATUS, successResponse, errorResponse } from "../../../utils/response.js";
import cartService from "../../../services/user/cartService.js";

const addToCart = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return errorResponse(res, STATUS.UNAUTHORIZED, 'Log in as user');
    }
    const userId = req.user._id;
    const result = await cartService.addItemToCart(userId, req.body);
    return successResponse(res, STATUS.OK, 'Item added to cart successfully', result);
});

const updateCartItem = catchAsync(async (req, res, next) => {
    if (!req.user) return errorResponse(res, STATUS.UNAUTHORIZED, 'Log in as user');
    const result = await cartService.updateCartItems(req.user._id, req.body);
    return successResponse(res, STATUS.OK, 'Cart updated', result);
});

const removeFromCart = catchAsync(async (req, res, next) => {
    if (!req.user) return errorResponse(res, STATUS.UNAUTHORIZED, 'Log in as user');
    const { productId } = req.params;
    const { variantId } = req.query; // Or req.body if you pass it there
    const result = await cartService.removeFromCart(req.user._id, productId, variantId);
    return successResponse(res, STATUS.OK, 'Item removed', result);
});

const removeUnavailableItems = catchAsync(async (req, res, next) => {
    if (!req.user) return errorResponse(res, STATUS.UNAUTHORIZED, 'Log in as user');
    const result = await cartService.removeUnavailableItems(req.user._id);
    return successResponse(res, STATUS.OK, 'Unavailable items removed', result);
});

const clearCart = catchAsync(async (req, res, next) => {
    if (!req.user) return errorResponse(res, STATUS.UNAUTHORIZED, 'Log in as user');
    await cartService.clearCart(req.user._id);
    return successResponse(res, STATUS.OK, 'Cart cleared');
});

const getCartCount = catchAsync(async (req, res, next) => {
    if (!req.user) return successResponse(res, STATUS.OK, 'Cart count', { count: 0 });
    const count = await cartService.getCartCount(req.user._id);
    return successResponse(res, STATUS.OK, 'Cart count', { count });
});

const applyDiscount = catchAsync(async (req, res, next) => {
    return errorResponse(res, STATUS.BAD_REQUEST, 'Discount applied at checkout only');
});

const validateStock = catchAsync(async (req, res, next) => {
    if (!req.user) return errorResponse(res, STATUS.UNAUTHORIZED, 'Log in as user');
    const result = await cartService.validateStock(req.user._id);
    if (result.success === false) {
        // Return raw result so frontend can see insufficientItems directly
        return res.status(STATUS.BAD_REQUEST).json(result);
    }
    return successResponse(res, STATUS.OK, 'Stock validated successfully');
});

export default {
    addToCart,
    updateCartItem,
    removeFromCart,
    removeUnavailableItems,
    clearCart,
    getCartCount,
    applyDiscount,
    validateStock
};
