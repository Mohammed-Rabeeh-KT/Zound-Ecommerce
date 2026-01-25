import Cart from '../models/cartSchema.js';
import Wishlist from '../models/wishlistSchema.js';

const localsMiddleware = async (req, res, next) => {
    try {
        res.locals.user = req.user || null;
        res.locals.searchQuery = req.query.search || '';
        res.locals.cartCount = 0;
        res.locals.wishlistCount = 0;

        // Fetch cart and wishlist counts for logged-in users
        if (req.user && req.user._id) {
            const userId = req.user._id;

            // Cart uses 'items' array
            const cart = await Cart.findOne({ userId });
            if (cart && cart.items) {
                res.locals.cartCount = cart.items.length;
            }

            // Wishlist uses 'products' array
            const wishlist = await Wishlist.findOne({ userId });
            if (wishlist && wishlist.products) {
                res.locals.wishlistCount = wishlist.products.length;
            }
        }

        next();
    } catch (error) {
        console.error('Error in localsMiddleware:', error);
        // Don't block the request, just set defaults
        res.locals.cartCount = 0;
        res.locals.wishlistCount = 0;
        next();
    }
};

export default localsMiddleware;