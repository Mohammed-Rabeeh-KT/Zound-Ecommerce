import Cart from '../../models/cartSchema.js';
import Product from '../../models/productSchema.js';
import Category from '../../models/categorySchema.js';
import offerController from "../../controllers/admin/ssr/offerManagementController.js";
import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";

const MAX_QUANTITY_PER_PRODUCT = 10;

const getCartData = async (userId) => {
    const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: [
            { path: 'brand', select: 'brandName' },
            { path: 'category', select: 'name isListed' }
        ]
    });

    let cartTotal = 0;
    let savings = 0;
    let hasStockIssues = false;
    let blockedItems = [];

    if (cart && cart.items) {
        const validItems = [];

        cart.items.forEach(item => {
            if (!item.productId) return;

            let isBlocked = false;
            // Check if product is blocked or deleted
            if (item.productId.isDeleted || item.productId.status !== 'Active') {
                isBlocked = true;
            }
            // Check if category is blocked
            if (item.productId.category && !item.productId.category.isListed) {
                isBlocked = true;
            }

            if (isBlocked) {
                if (item.productId.productName) {
                    blockedItems.push(item.productId.productName);
                }
            } else {
                validItems.push(item);
            }
        });

        if (cart.items.length !== validItems.length) {
            cart.items = validItems;
            await cart.save();
        }

        // Calculate offers for each item using async for loop
        for (let i = 0; i < cart.items.length; i++) {
            const item = cart.items[i];
            const product = item.productId;

            // Find the variant
            const variant = product.variants?.find(
                v => v._id.toString() === item.variantId?.toString()
            ) || product.variants?.[0];

            if (variant) {
                // Find variant index
                const variantIndex = product.variants.findIndex(v => v._id.toString() === variant._id.toString());

                // Calculate offer for this product/variant
                const offerData = await offerController.calculateOfferPrice(product, variantIndex >= 0 ? variantIndex : 0);

                // Attach offer data to item
                item.offer = offerData;

                // Use offer price if available
                const effectivePrice = offerData.hasOffer ? offerData.offerPrice : variant.salePrice;
                item.effectivePrice = effectivePrice;
                item.effectiveTotalPrice = effectivePrice * item.quantity;

                // Check for stock issues (insufficient stock)
                if (item.quantity > variant.stock) {
                    hasStockIssues = true;
                }

                if (variant.stock > 0) {
                    cartTotal += item.effectiveTotalPrice;

                    // Calculate savings from offers
                    if (offerData.hasOffer) {
                        savings += (offerData.originalPrice - offerData.offerPrice) * item.quantity;
                    } else if (variant.basePrice && variant.salePrice && variant.basePrice > variant.salePrice) {
                        savings += (variant.basePrice - variant.salePrice) * item.quantity;
                    }
                }
            }
        }
    }

    return {
        cart: cart || { items: [] },
        cartTotal,
        savings,
        cartCount: cart?.items?.length || 0,
        hasStockIssues, // Pass flag to view
        blockedItems // Pass blocked items names
    };
};

const addItemToCart = async (userId, data) => {
    const { productId, quantity = 1, variantId = null } = data;

    // Validate quantity input
    if (quantity < 1 || quantity > MAX_QUANTITY_PER_PRODUCT) {
        throw new AppError(`Quantity must be between 1 and ${MAX_QUANTITY_PER_PRODUCT}`, STATUS.BAD_REQUEST);
    }

    // Validate product and populate category
    const product = await Product.findById(productId).populate('category', 'name isListed');
    if (!product) {
        throw new AppError('Product not found', STATUS.NOT_FOUND);
    }

    // Check if product is deleted
    if (product.isDeleted) {
        throw new AppError('This product is no longer available', STATUS.BAD_REQUEST);
    }

    // Check if product is active/listed
    if (product.status !== 'Active') {
        throw new AppError('This product is currently unavailable', STATUS.BAD_REQUEST);
    }

    // Check if category is listed (not blocked)
    if (product.category && !product.category.isListed) {
        throw new AppError('This product category is currently unavailable', STATUS.BAD_REQUEST);
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
        throw new AppError('No available variant found for this product', STATUS.BAD_REQUEST);
    }

    // Check stock
    if (selectedVariant.stock < quantity) {
        throw new AppError(`Only ${selectedVariant.stock} items available in stock`, STATUS.BAD_REQUEST);
    }

    // Get price from variant
    const price = selectedVariant.salePrice;
    if (!price || isNaN(price) || price <= 0) {
        throw new AppError('Invalid product price', STATUS.BAD_REQUEST);
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
                throw new AppError(`Maximum quantity limit reached (${MAX_QUANTITY_PER_PRODUCT}) or stock limit reached`, STATUS.BAD_REQUEST);
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
    return { cartCount: cart.items.length };
};

const updateCartItems = async (userId, data) => {
    const { productId, quantity, variantId = null } = data;

    // Validate quantity
    if (quantity < 1 || quantity > MAX_QUANTITY_PER_PRODUCT) {
        throw new AppError(`Quantity must be between 1 and ${MAX_QUANTITY_PER_PRODUCT}`, STATUS.BAD_REQUEST);
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
        throw new AppError('Cart not found', STATUS.NOT_FOUND);
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
        throw new AppError('Item not found in cart', STATUS.NOT_FOUND);
    }

    // Fetch product to check current stock
    const product = await Product.findById(productId).populate('category', 'isListed');
    if (!product || product.isDeleted || product.status !== 'Active') {
        throw new AppError('This product is no longer available', STATUS.BAD_REQUEST);
    }

    // Check category status
    if (product.category && !product.category.isListed) {
        throw new AppError('This product category is currently unavailable', STATUS.BAD_REQUEST);
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
        throw new AppError('This variant is no longer available', STATUS.BAD_REQUEST);
    }

    // Check stock
    if (variant.stock <= 0) {
        throw new AppError('This product is currently out of stock', STATUS.BAD_REQUEST);
    }

    // Validate quantity against available stock
    const maxAllowed = Math.min(MAX_QUANTITY_PER_PRODUCT, variant.stock);
    if (quantity > maxAllowed) {
        throw new AppError(`Only ${variant.stock} items available in stock. Maximum ${MAX_QUANTITY_PER_PRODUCT} per order.`, STATUS.BAD_REQUEST);
    }

    // Update quantity and total price
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].totalPrice = cart.items[itemIndex].price * quantity;

    await cart.save();

    return {
        cartCount: cart.items.length,
        newTotal: cart.items[itemIndex].totalPrice,
        quantity: quantity
    };
};

const removeFromCart = async (userId, productId, variantId) => {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
        throw new AppError('Cart not found', STATUS.NOT_FOUND);
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
        throw new AppError('Item not found in cart', STATUS.NOT_FOUND);
    }

    await cart.save();

    return { cartCount: cart.items.length };
};

const clearCart = async (userId) => {
    const cart = await Cart.findOne({ userId });
    if (!cart) {
        throw new AppError('Cart not found', STATUS.NOT_FOUND);
    }
    cart.items = [];
    await cart.save();
    return true;
};

const removeUnavailableItems = async (userId) => {
    const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: [
            { path: 'category', select: 'isListed' }
        ]
    });

    if (!cart || !cart.items.length) {
        return { removedCount: 0 };
    }

    const validItems = [];
    let removedCount = 0;
    const removedItems = [];

    for (const item of cart.items) {
        const product = item.productId;

        // Skip if product doesn't exist
        if (!product) {
            removedCount++;
            continue;
        }

        // Check if product is blocked or deleted
        if (product.isDeleted || product.status !== 'Active') {
            removedItems.push(product.productName);
            removedCount++;
            continue;
        }

        // Check if category is blocked
        if (product.category && !product.category.isListed) {
            removedItems.push(product.productName);
            removedCount++;
            continue;
        }

        // Find the variant
        const variant = product.variants?.find(
            v => v._id.toString() === item.variantId?.toString()
        ) || product.variants?.[0];

        // Check if variant exists and has stock
        if (!variant || variant.stock <= 0) {
            removedItems.push(product.productName);
            removedCount++;
            continue;
        }

        // Adjust quantity if it exceeds available stock
        if (item.quantity > variant.stock) {
            item.quantity = variant.stock;
        }

        validItems.push(item);
    }

    // Update cart with only valid items
    cart.items = validItems;
    await cart.save();

    return {
        removedCount,
        removedItems,
        cartCount: cart.items.length
    };
};

const getCartCount = async (userId) => {
    if (!userId) return 0;
    const cart = await Cart.findOne({ userId });
    return cart?.items?.length || 0;
};

const validateStock = async (userId) => {
    const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        populate: [
            { path: 'brand', select: 'brandName' },
            { path: 'category', select: 'name isListed' }
        ]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
        throw new AppError('Your cart is empty', STATUS.BAD_REQUEST);
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

    // If any issues found, return them (we handle this as a special response in controller)
    if (outOfStockItems.length > 0 || insufficientItems.length > 0) {
        return {
            success: false,
            message: 'Some items have stock issues',
            outOfStockItems,
            insufficientItems
        };
    }

    return { success: true };
};

export default {
    getCartData,
    addItemToCart,
    updateCartItems,
    removeFromCart,
    clearCart,
    removeUnavailableItems,
    getCartCount,
    validateStock
};
