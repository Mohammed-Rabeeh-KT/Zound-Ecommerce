import User from '../../models/userSchema.js';
import Wishlist from '../../models/wishlistSchema.js';
import Cart from '../../models/cartSchema.js';

const localsMiddleware = async (req, res, next) => {
    try {
        if (req.user) {
            res.locals.user = req.user;
        } else if (req.session.user) {
            const user = await User.findById(req.session.user);
            res.locals.user = user;
        } else {
            res.locals.user = null;
        }
        res.locals.url = req.url;
        res.locals.wishlistProductIds = [];
        res.locals.wishlistCount = 0;
        res.locals.cartCount = 0;

        if (res.locals.user) {
            const [wishlist, cart] = await Promise.all([
                Wishlist.findOne({ userId: res.locals.user._id }),
                Cart.findOne({ userId: res.locals.user._id })
            ]);

            if (wishlist && wishlist.products) {
                res.locals.wishlistProductIds = wishlist.products.map(p => p.productId.toString());
                res.locals.wishlistCount = wishlist.products.length;
            }

            if (cart && cart.items) {
                res.locals.cartCount = cart.items.length;
            }
        } else if (req.session && req.session.cart) {
            res.locals.cartCount = req.session.cart.length;
        }

        next();
    } catch (error) {
        console.error('Error in localsMiddleware:', error);
        res.locals.user = null;
        next();
    }
};

export default localsMiddleware;
