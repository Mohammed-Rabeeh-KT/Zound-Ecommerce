import Wishlist from '../../models/wishlistSchema.js';
import Product from '../../models/productSchema.js';
import Cart from '../../models/cartSchema.js';
import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import { STATUS, MESSAGE, successResponse, errorResponse } from "../../utils/response.js";

// Load wishlist page
const loadWishlist = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const wishlist = await Wishlist.findOne({ userId }).populate({
        path: 'products.productId',
        populate: [
            { path: 'brand', select: 'brandName' },
            { path: 'category', select: 'name isListed' }
        ]
    });

    // Filter out deleted or unavailable products
    if (wishlist && wishlist.products) {
        wishlist.products = wishlist.products.filter(item => {
            if (!item.productId) return false;
            if (item.productId.isDeleted) return false;
            return true;
        });
        await wishlist.save();
    }

    res.render('user/wishlist', {
        user: req.user,
        wishlist: wishlist || { products: [] },
        wishlistCount: wishlist?.products?.length || 0
    });
});

// Add to wishlist (with variant support)
const addToWishlist = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return errorResponse(res, STATUS.UNAUTHORIZED, 'Log in as user');
    }

    const userId = req.user._id;
    const { productId, variantId = null } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Product not found');
    }

    if (product.isDeleted || product.status !== 'Active') {
        return errorResponse(res, STATUS.BAD_REQUEST, 'This product is not available');
    }

    // Get the variant (either specified or first active one)
    let selectedVariant = null;
    if (variantId) {
        selectedVariant = product.variants.find(v => v._id.toString() === variantId);
    } else {
        // Use first active variant
        selectedVariant = product.variants.find(v => v.status === 'Active');
    }

    const finalVariantId = selectedVariant ? selectedVariant._id : null;

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
        wishlist = new Wishlist({
            userId,
            products: [{ productId, variantId: finalVariantId }]
        });
    } else {
        // Check if exact product+variant combination already in wishlist
        const existingItem = wishlist.products.find(item => {
            const productMatch = item.productId.toString() === productId.toString();
            if (!productMatch) return false;

            // Compare variant IDs (handle null/undefined cases)
            const itemVariantId = item.variantId?.toString() || null;
            const targetVariantId = finalVariantId?.toString() || null;
            return itemVariantId === targetVariantId;
        });

        if (existingItem) {
            return errorResponse(res, STATUS.BAD_REQUEST, 'This variant is already in your wishlist');
        }

        wishlist.products.push({ productId, variantId: finalVariantId });
    }

    await wishlist.save();

    return successResponse(res, STATUS.OK, 'Added to wishlist', {
        wishlistCount: wishlist.products.length,
        variantId: finalVariantId
    });
});

// Remove from wishlist (with variant support)
const removeFromWishlist = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { productId } = req.params;
    const { variantId = null } = req.query;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Wishlist not found');
    }

    const originalLength = wishlist.products.length;

    wishlist.products = wishlist.products.filter(item => {
        const productMatch = item.productId.toString() === productId;
        if (!productMatch) return true; // Keep non-matching products

        // If variantId is specified, only remove that specific variant
        if (variantId) {
            return !(item.variantId && item.variantId.toString() === variantId);
        }

        // If no variantId specified, remove all entries for this product
        return false;
    });

    if (wishlist.products.length === originalLength) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Item not found in wishlist');
    }

    await wishlist.save();

    return successResponse(res, STATUS.OK, 'Removed from wishlist', {
        wishlistCount: wishlist.products.length
    });
});

// Clear wishlist
const clearWishlist = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Wishlist not found');
    }

    wishlist.products = [];
    await wishlist.save();

    return successResponse(res, STATUS.OK, 'Wishlist cleared successfully', {
        wishlistCount: 0
    });
});

const moveToCart = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { productId, variantId = null } = req.body;

    const product = await Product.findById(productId)

    if (!product) {
        return errorResponse(res, STATUS.NOT_FOUND, "Product not found")
    }

    if (product.isDeleted || product.status !== 'Active') {
        return errorResponse(res, STATUS.BAD_REQUEST, "Product is not available");
    }

    // Get variant details
    let selectedVariant = null;
    if (variantId) {
        selectedVariant = product.variants.find(v => v._id.toString() === variantId)
    } else {
        selectedVariant = product.variants.find(v => v.status === 'Active')
    }

    if (!selectedVariant) {
        return errorResponse(res, STATUS.BAD_REQUEST, "Variant not found");
    }

    // Check stock
    if (selectedVariant.stock < 1) {
        return errorResponse(res, STATUS.BAD_REQUEST, "Product is out of stock");
    }

    let cart = await Cart.findOne({ userId });
    const price = selectedVariant.salePrice || selectedVariant.basePrice;

    if (!cart) {
        cart = new Cart({
            userId,
            items: [{
                productId,
                variantId: selectedVariant._id,
                quantity: 1,
                price,
                totalPrice: price
            }]
        })
    } else {
        // Check if item already in cart
        const existingItem = cart.items.find(item => {
            const productMatch = item.productId.toString() === productId.toString();
            if (!productMatch) return false;

            // Compare variant IDs (handle null/undefined cases)
            const itemVariantId = item.variantId?.toString() || null;
            const selectedVariantId = selectedVariant._id?.toString() || null;
            return itemVariantId === selectedVariantId;
        });

        if (existingItem) {
            // Increase quantity (max 10)
            if (existingItem.quantity >= 10) {
                return errorResponse(res, STATUS.BAD_REQUEST, 'Maximum quantity (10) already in cart');
            }
            if (existingItem.quantity >= selectedVariant.stock) {
                return errorResponse(res, STATUS.BAD_REQUEST, 'Not enough stock available');
            }
            existingItem.quantity += 1;
            existingItem.totalPrice = existingItem.price * existingItem.quantity;
        } else {
            cart.items.push({
                productId,
                variantId: selectedVariant._id,
                quantity: 1,
                price,
                totalPrice: price
            });
        }
    }

    await cart.save();

    // 4. Remove from wishlist
    const wishlist = await Wishlist.findOne({ userId });
    if (wishlist) {
        const beforeCount = wishlist.products.length;

        // Remove the product from wishlist (by productId)
        wishlist.products = wishlist.products.filter(item => {
            return item.productId.toString() !== productId.toString();
        });

        console.log('Wishlist: Removed', beforeCount - wishlist.products.length, 'item(s)');

        await wishlist.save();
    }
    return successResponse(res, STATUS.OK, 'Moved to cart successfully', {
        cartCount: cart.items.length,
        wishlistCount: wishlist?.products?.length || 0
    });


})

// Get wishlist count
const getWishlistCount = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const wishlist = await Wishlist.findOne({ userId });
    const count = wishlist?.products?.length || 0;

    return successResponse(res, STATUS.OK, 'Wishlist count retrieved', {
        count
    });
});

// Check if product+variant is in wishlist
const checkWishlist = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { productId } = req.params;
    const { variantId = null } = req.query;

    const wishlist = await Wishlist.findOne({ userId });

    let isInWishlist = false;
    if (wishlist && wishlist.products) {
        isInWishlist = wishlist.products.some(item => {
            const productMatch = item.productId.toString() === productId;
            if (!productMatch) return false;

            if (variantId) {
                return item.variantId && item.variantId.toString() === variantId;
            }
            return true;
        });
    }

    return successResponse(res, STATUS.OK, 'Wishlist status retrieved', {
        isInWishlist
    });
});



export default {
    loadWishlist,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    getWishlistCount,
    checkWishlist,
    moveToCart
};
