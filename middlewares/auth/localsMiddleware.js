import User from '../../models/userSchema.js';
import Wishlist from '../../models/wishlistSchema.js';

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

        if (res.locals.user) {
            const wishlist = await Wishlist.findOne({ userId: res.locals.user._id });
            if (wishlist && wishlist.products) {
                res.locals.wishlistProductIds = wishlist.products.map(p => p.productId.toString());
            }
        }

        next();
    } catch (error) {
        console.error('Error in localsMiddleware:', error);
        res.locals.user = null;
        next();
    }
};

export default localsMiddleware;
