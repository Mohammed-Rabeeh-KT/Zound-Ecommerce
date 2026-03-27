import { catchAsync } from "../../../utils/catchAsync.js";
import wishlistService from "../../../services/user/wishlistService.js";

// Load Wishlist Page (SSR + AJAX pagination)
const loadWishlist = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;

    const data = await wishlistService.getWishlistData(userId, page);

    // Return JSON for AJAX pagination requests
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.json({
            products: data.wishlist.products,
            pagination: data.pagination
        });
    }

    res.render('user/wishlist', {
        layout: 'layout',
        user: req.user || null,
        wishlist: data.wishlist,
        pagination: data.pagination,
        totalItems: data.totalItems,
        currentPage: 'wishlist'
    });
});

export default {
    loadWishlist
};
