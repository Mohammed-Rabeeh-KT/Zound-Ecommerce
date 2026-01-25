import Cart from '../../models/cartSchema.js';
import Product from '../../models/productSchema.js';
import Category from '../../models/categorySchema.js';
import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import { STATUS, MESSAGE, successResponse, errorResponse } from "../../utils/response.js";

// Maximum quantity allowed per product
const MAX_QUANTITY_PER_PRODUCT = 10;

const loadCart = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: [
            { path: 'brand', select: 'brandName' },
            { path: 'category', select: 'name isListed' }
        ]
    });

    let cartTotal = 0;
    let savings = 0;
    let stockAdjustmentMessages = []; // Collect messages for stock adjustments
    let cartModified = false;

    let hasStockIssues = false;

    if (cart && cart.items) {
        // Filter out items where product is deleted, unlisted, or category is unlisted
        cart.items = cart.items.filter(item => {
            if (!item.productId) return false;
            if (item.productId.isDeleted) return false;
            if (item.productId.status !== 'Active') return false;
            if (item.productId.category && !item.productId.category.isListed) return false;
            return true;
        });

        // Calculate totals for in-stock items only
        cart.items.forEach(item => {
            const variant = item.productId.variants?.find(
                v => v._id.toString() === item.variantId?.toString()
            ) || item.productId.variants?.[0];

            if (variant) {
                // Check for stock issues (insufficient stock)
                if (item.quantity > variant.stock) {
                    hasStockIssues = true;
                }

                if (variant.stock > 0) {
                    cartTotal += item.totalPrice;
                    if (variant.basePrice && variant.salePrice && variant.basePrice > variant.salePrice) {
                        savings += (variant.basePrice - variant.salePrice) * item.quantity;
                    }
                }
            }
        });

        // Save cart if items were filtered out
        // await cart.save(); // DISABLED to prevent accidental item deletion during edge cases
    }

    res.render('user/cart', {
        user: req.user || null,
        cart: cart || { items: [] },
        cartTotal,
        savings,
        cartCount: cart?.items?.length || 0,
        hasStockIssues // Pass flag to view
    });
});


const addToCart = catchAsync(async (req, res, next) => {
    if (!req.user) {
        return errorResponse(res, STATUS.UNAUTHORIZED, 'Log in as user');
    }

    const userId = req.user._id;
    const { productId, quantity = 1, variantId = null } = req.body;

    // Validate quantity input
    if (quantity < 1 || quantity > MAX_QUANTITY_PER_PRODUCT) {
        return errorResponse(res, STATUS.BAD_REQUEST, `Quantity must be between 1 and ${MAX_QUANTITY_PER_PRODUCT}`);
    }

    // Validate product and populate category
    const product = await Product.findById(productId).populate('category', 'name isListed');
    if (!product) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Product not found');
    }

    // Check if product is deleted
    if (product.isDeleted) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'This product is no longer available');
    }

    // Check if product is active/listed
    if (product.status !== 'Active') {
        return errorResponse(res, STATUS.BAD_REQUEST, 'This product is currently unavailable');
    }

    // Check if category is listed (not blocked)
    if (product.category && !product.category.isListed) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'This product category is currently unavailable');
    }

    // Find the variant - either by variantId or use the first active variant
    let selectedVariant = null;

    if (variantId) {
        selectedVariant = product.variants.find(v => v._id.toString() === variantId);
    } else {
        // Use first active variant with stock
        selectedVariant = product.variants.find(v => v.status === 'Active' && v.stock > 0);
    }

    if (!selectedVariant) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'No available variant found for this product');
    }

    // Check stock
    if (selectedVariant.stock < quantity) {
        return errorResponse(res, STATUS.BAD_REQUEST, `Only ${selectedVariant.stock} items available in stock`);
    }

    // Get price from variant
    const price = selectedVariant.salePrice;
    if (!price || isNaN(price) || price <= 0) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Invalid product price');
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });

    if (!cart) {
        // Create new cart with item
        const itemQty = Math.min(quantity, MAX_QUANTITY_PER_PRODUCT, selectedVariant.stock);
        cart = new Cart({
            userId,
            items: [{
                productId,
                variantId: selectedVariant._id,
                quantity: itemQty,
                price,
                totalPrice: price * itemQty
            }]
        });
    } else {
        // Check if item already exists in cart (same product AND same variant)
        const existingItemIndex = cart.items.findIndex(item => {
            const productMatch = item.productId.toString() === productId.toString();
            if (!productMatch) return false;

            // Compare variant IDs
            const itemVariantId = item.variantId?.toString() || null;
            const selectedVariantId = selectedVariant._id?.toString() || null;
            return itemVariantId === selectedVariantId;
        });

        if (existingItemIndex > -1) {
            // Item exists - increase quantity
            const currentQty = cart.items[existingItemIndex].quantity;
            const maxAllowed = Math.min(MAX_QUANTITY_PER_PRODUCT, selectedVariant.stock);
            const newQuantity = Math.min(currentQty + quantity, maxAllowed);

            if (newQuantity === currentQty) {
                return errorResponse(res, STATUS.BAD_REQUEST,
                    `Maximum quantity limit reached (${MAX_QUANTITY_PER_PRODUCT}) or stock limit reached`);
            }

            cart.items[existingItemIndex].quantity = newQuantity;
            cart.items[existingItemIndex].totalPrice = cart.items[existingItemIndex].price * newQuantity;
        } else {
            // Add new item
            const itemQty = Math.min(quantity, MAX_QUANTITY_PER_PRODUCT, selectedVariant.stock);
            cart.items.push({
                productId,
                variantId: selectedVariant._id,
                quantity: itemQty,
                price,
                totalPrice: price * itemQty
            });
        }
    }

    await cart.save();

    return successResponse(res, STATUS.OK, 'Item added to cart successfully', {
        cartCount: cart.items.length
    });
});

const updateCartItem = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { productId, quantity, variantId = null } = req.body;

    // Validate quantity
    if (quantity < 1 || quantity > MAX_QUANTITY_PER_PRODUCT) {
        return errorResponse(res, STATUS.BAD_REQUEST, `Quantity must be between 1 and ${MAX_QUANTITY_PER_PRODUCT}`);
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Cart not found');
    }

    // Find item in cart (match both productId AND variantId)
    const itemIndex = cart.items.findIndex(item => {
        const productMatch = item.productId.toString() === productId;
        if (!productMatch) return false;
        if (variantId) {
            return item.variantId && item.variantId.toString() === variantId;
        }
        return true;
    });

    if (itemIndex === -1) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Item not found in cart');
    }

    // Fetch product to check current stock
    const product = await Product.findById(productId).populate('category', 'isListed');
    if (!product || product.isDeleted || product.status !== 'Active') {
        // Remove invalid item from cart
        // cart.items.splice(itemIndex, 1);
        // await cart.save();
        return errorResponse(res, STATUS.BAD_REQUEST, 'This product is no longer available');
    }

    // Check category status
    if (product.category && !product.category.isListed) {
        // cart.items.splice(itemIndex, 1);
        // await cart.save();
        return errorResponse(res, STATUS.BAD_REQUEST, 'This product category is currently unavailable');
    }

    // Find the variant in the cart item
    const cartVariantId = cart.items[itemIndex].variantId;
    let variant = product.variants.find(v => v._id.toString() === cartVariantId?.toString());

    // Fallback to first variant if specific one not found (matches loadCart behavior)
    if (!variant && product.variants.length > 0) {
        variant = product.variants[0];
        // Auto-correct the variant ID in cart since we are using the fallback
        cart.items[itemIndex].variantId = variant._id;
    }

    if (!variant) {
        // cart.items.splice(itemIndex, 1);
        // await cart.save();
        return errorResponse(res, STATUS.BAD_REQUEST, 'This variant is no longer available');
    }

    // Check stock
    if (variant.stock <= 0) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'This product is currently out of stock');
    }

    // Validate quantity against available stock
    const maxAllowed = Math.min(MAX_QUANTITY_PER_PRODUCT, variant.stock);
    if (quantity > maxAllowed) {
        return errorResponse(res, STATUS.BAD_REQUEST, `Only ${variant.stock} items available in stock. Maximum ${MAX_QUANTITY_PER_PRODUCT} per order.`);
    }

    // Update quantity and total price
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].totalPrice = cart.items[itemIndex].price * quantity;

    await cart.save();

    return successResponse(res, STATUS.OK, 'Cart updated successfully', {
        cartCount: cart.items.length,
        newTotal: cart.items[itemIndex].totalPrice,
        quantity: quantity
    });
});

const removeFromCart = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { productId } = req.params;
    const { variantId } = req.query; // Get variantId from query params

    const cart = await Cart.findOne({ userId });
    if (!cart) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Cart not found');
    }

    // Filter out the item to remove (match both productId and variantId if provided)
    const originalLength = cart.items.length;
    cart.items = cart.items.filter(item => {
        const productMatch = item.productId.toString() === productId;
        if (!productMatch) return true; // Keep items that don't match productId

        // If variantId is provided, also check variantId
        if (variantId) {
            return item.variantId?.toString() !== variantId;
        }
        // If no variantId, remove all items with this productId
        return false;
    });

    // Check if item was actually removed
    if (cart.items.length === originalLength) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Item not found in cart');
    }

    await cart.save();

    return successResponse(res, STATUS.OK, 'Item removed from cart successfully', {
        cartCount: cart.items.length
    });
});



// CLEAR ENTIRE CART
const clearCart = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const cart = await Cart.findOne({ userId });
    if (!cart) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Cart not found');
    }
    cart.items = [];
    await cart.save();
    return successResponse(res, STATUS.OK, 'Cart cleared successfully');
});


// GET CART COUNT (For header badge)
const getCartCount = catchAsync(async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) {
        return successResponse(res, STATUS.OK, 'Cart count', { count: 0 });
    }
    const cart = await Cart.findOne({ userId });
    const count = cart?.items?.length || 0;

    return successResponse(res, STATUS.OK, 'Cart count', { count });
});


// APPLY DISCOUNT CODE
const applyDiscount = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { code } = req.body;

    if (!code || !code.trim()) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Please enter a discount code');
    }

    // TODO: Implement coupon/discount logic here
    // For now, return a placeholder response
    return errorResponse(res, STATUS.NOT_FOUND, 'Invalid or expired discount code');
});


// VALIDATE CART STOCK - Check if all items have sufficient stock before checkout
const validateStock = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: [
            { path: 'brand', select: 'brandName' },
            { path: 'category', select: 'name isListed' }
        ]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Your cart is empty');
    }

    const insufficientItems = [];
    const outOfStockItems = [];

    for (const item of cart.items) {
        const product = item.productId;

        if (!product || product.isDeleted || product.status !== 'Active') {
            outOfStockItems.push({
                productName: product?.productName || 'Unknown Product',
                reason: 'Product no longer available'
            });
            continue;
        }

        if (product.category && !product.category.isListed) {
            outOfStockItems.push({
                productName: product.productName,
                reason: 'Category unavailable'
            });
            continue;
        }

        // Find the variant
        let variant = null;
        if (product.variants && item.variantId) {
            variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
        }
        if (!variant && product.variants && product.variants.length > 0) {
            variant = product.variants[0];
        }

        if (!variant || variant.status !== 'Active') {
            outOfStockItems.push({
                productName: product.productName,
                reason: 'Variant unavailable'
            });
            continue;
        }

        // Check stock
        if (variant.stock <= 0) {
            outOfStockItems.push({
                productName: product.productName,
                reason: 'Out of stock'
            });
        } else if (variant.stock < item.quantity) {
            // Insufficient stock - cart quantity exceeds available
            insufficientItems.push({
                productId: product._id,
                variantId: item.variantId,
                productName: product.productName,
                cartQuantity: item.quantity,
                availableStock: variant.stock
            });
        }
    }

    // If any issues found, return error
    if (outOfStockItems.length > 0 || insufficientItems.length > 0) {
        return res.status(200).json({
            success: false,
            message: 'Some items have stock issues',
            outOfStockItems,
            insufficientItems
        });
    }

    // All good!
    return successResponse(res, STATUS.OK, 'Cart validated successfully');
});


export default {
    loadCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    getCartCount,
    applyDiscount,
    validateStock
}
