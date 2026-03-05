import { catchAsync } from "../../../utils/catchAsync.js";
import wishlistService from "../../../services/user/wishlistService.js";

// Load Wishlist Page (SSR)
const loadWishlist = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const data = await wishlistService.getWishlistData(userId);

    res.render('user/wishlist', {
        layout: 'layout',
        user: req.user || null,
        wishlist: data.wishlist,
        currentPage: 'wishlist'
    });
});

export default {
    loadWishlist
};
