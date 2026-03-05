import { catchAsync } from "../../../utils/catchAsync.js";
import cartService from "../../../services/user/cartService.js";

const loadCart = catchAsync(async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
        return res.render('user/cart', {
            user: null,
            cart: { items: [] },
            cartTotal: 0,
            savings: 0,
            cartCount: 0,
            hasStockIssues: false,
            blockedItems: []
        });
    }

    const userId = req.user._id;
    const data = await cartService.getCartData(userId);

    res.render('user/cart', {
        user: req.user || null,
        ...data
    });
});

export default {
    loadCart
};
