import Wishlist from '../../models/wishlistSchema.js';
import Product from '../../models/productSchema.js';
import Cart from '../../models/cartSchema.js';
import AppError from '../../utils/AppError.js';
import { STATUS } from '../../utils/response.js';
import offerService from '../admin/offerService.js';

// Get wishlist data for the user (with pagination)
const getWishlistData = async (userId, page = 1, limit = 9) => {
    const wishlist = await Wishlist.findOne({ userId }).populate({
        path: 'products.productId',
        populate: [
            { path: 'brand', select: 'brandName' },
            { path: 'category', select: 'name' }
        ]
    });

    if (!wishlist || !wishlist.products || wishlist.products.length === 0) {
        return {
            wishlist: { products: [] },
            totalItems: 0,
            pagination: {
                currentPage: 1,
                totalPages: 0,
                totalItems: 0,
                hasNextPage: false,
                hasPrevPage: false
            }
        };
    }

    // Filter out items with deleted/null products
    const validProducts = wishlist.products.filter(item => item.productId);
    const totalItems = validProducts.length;
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;

    // Slice for pagination
    const paginatedProducts = validProducts.slice(skip, skip + limit);

    // Apply offer data to each paginated item
    const productsWithOffers = await Promise.all(
        paginatedProducts.map(async (item) => {
            const product = item.productId;
            let offerData = null;

            // Find matching variant
            let variantIndex = 0;
            if (item.variantId && product.variants) {
                const idx = product.variants.findIndex(
                    v => v._id.toString() === item.variantId.toString()
                );
                if (idx !== -1) variantIndex = idx;
            }

            try {
                offerData = await offerService.calculateOfferPrice(product, variantIndex);
            } catch (e) {
                // Offer calculation failed — continue without offer
            }

            // Attach offer info to the item object
            const itemObj = item.toObject ? item.toObject() : { ...item };
            if (offerData && offerData.hasOffer) {
                itemObj.offer = {
                    hasOffer: true,
                    offerPrice: offerData.offerPrice,
                    originalPrice: offerData.originalPrice,
                    discount: offerData.discount,
                    discountType: offerData.discountType,
                    offerTitle: offerData.offerTitle
                };
            } else {
                itemObj.offer = { hasOffer: false };
            }

            return itemObj;
        })
    );

    return {
        wishlist: { ...wishlist.toObject(), products: productsWithOffers },
        totalItems,
        pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

// Get wishlist count
const getWishlistCount = async (userId) => {
    const wishlist = await Wishlist.findOne({ userId });
    return wishlist ? wishlist.products.length : 0;
};

// Add product to wishlist
const addToWishlist = async (userId, productId, variantId = null) => {
    if (!productId) {
        throw new AppError('Product ID is required', STATUS.BAD_REQUEST);
    }

    // Verify product exists and is active
    const product = await Product.findById(productId);
    if (!product || product.isDeleted || product.status !== 'Active') {
        throw new AppError('Product not found or unavailable', STATUS.NOT_FOUND);
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
        wishlist = new Wishlist({ userId, products: [] });
    }

    // Check if product already exists in wishlist
    const exists = wishlist.products.some(item => {
        if (variantId) {
            return item.productId.toString() === productId &&
                item.variantId && item.variantId.toString() === variantId;
        }
        return item.productId.toString() === productId;
    });

    if (exists) {
        throw new AppError('Product already in wishlist', STATUS.BAD_REQUEST);
    }

    wishlist.products.push({
        productId,
        variantId: variantId || null,
        addedOn: new Date()
    });

    await wishlist.save();

    return { wishlistCount: wishlist.products.length };
};

// Remove product from wishlist
const removeFromWishlist = async (userId, productId, variantId = null) => {
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
        throw new AppError('Wishlist not found', STATUS.NOT_FOUND);
    }

    const initialLength = wishlist.products.length;

    if (variantId) {
        wishlist.products = wishlist.products.filter(item => {
            return !(item.productId.toString() === productId &&
                item.variantId && item.variantId.toString() === variantId);
        });
    } else {
        wishlist.products = wishlist.products.filter(item => {
            return item.productId.toString() !== productId;
        });
    }

    if (wishlist.products.length === initialLength) {
        throw new AppError('Product not found in wishlist', STATUS.NOT_FOUND);
    }

    await wishlist.save();

    return { wishlistCount: wishlist.products.length };
};

// Clear entire wishlist
const clearWishlist = async (userId) => {
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
        throw new AppError('Wishlist not found', STATUS.NOT_FOUND);
    }

    wishlist.products = [];
    await wishlist.save();

    return true;
};

// Move item from wishlist to cart
const moveToCart = async (userId, productId, variantId = null) => {
    if (!productId) {
        throw new AppError('Product ID is required', STATUS.BAD_REQUEST);
    }

    // Verify product exists and is active
    const product = await Product.findById(productId);
    if (!product || product.isDeleted || product.status !== 'Active') {
        throw new AppError('Product not found or unavailable', STATUS.NOT_FOUND);
    }

    // Determine which variant to add
    let targetVariantId = variantId;
    if (!targetVariantId && product.variants && product.variants.length > 0) {
        targetVariantId = product.variants[0]._id;
    }

    // Check stock
    if (targetVariantId) {
        const variant = product.variants.find(v => v._id.toString() === targetVariantId.toString());
        if (!variant || variant.stock <= 0) {
            throw new AppError('Product is out of stock', STATUS.BAD_REQUEST);
        }
    }

    // Add to cart using cartService
    const cartService = (await import('./cartService.js')).default;
    await cartService.addItemToCart(userId, { productId, variantId: targetVariantId, quantity: 1 });

    // Remove from wishlist
    await removeFromWishlist(userId, productId, variantId);

    // Get updated cart count
    const cart = await Cart.findOne({ userId });
    const cartCount = cart ? cart.items.length : 0;

    return { cartCount };
};

export default {
    getWishlistData,
    getWishlistCount,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    moveToCart
};
