import express from 'express';
const router = express.Router();
import { authenticateUser, requireUser } from '../../middlewares/auth/authMiddleware.js';

// ==========================================
// Controllers (SSR)
// ==========================================
import homeController from '../../controllers/user/ssr/homeController.js';
import authController from '../../controllers/user/ssr/authController.js';
import userController from '../../controllers/user/ssr/userController.js';
import productController from '../../controllers/user/ssr/productController.js';
import cartController from '../../controllers/user/ssr/cartController.js';
import checkoutController from '../../controllers/user/ssr/checkoutController.js';
import wishlistController from '../../controllers/user/ssr/wishlistController.js';
import brandController from '../../controllers/user/ssr/brandController.js';
import dealController from '../../controllers/user/ssr/dealController.js';
import supportController from '../../controllers/user/ssr/supportController.js';
import { getProductReviewsPage, getUserReviewsPage } from '../../controllers/user/ssr/reviewController.js';

// ==========================================
// Authentication SSR Routes
// ==========================================
router.get('/login', authController.loadLogin);
router.get('/signup', authController.loadSignup);
router.get('/verify-otp', authController.loadVerifyOTP);
router.get('/forgot-password', authController.loadForgotPassword);
router.post('/forgot-password', authController.forgotPassword); // SSR POST
router.get('/fp-verify-otp', authController.loadFpVerifyOTP);
router.get('/fp-reset-password', authController.loadResetPassword);
router.get('/logout', authController.logout);

// Google OAuth
router.get('/auth/google', authController.googleLogin);
router.get('/auth/google/callback', authController.googleCallback);

// ==========================================
// Homepage & Static SSR Routes
// ==========================================
router.get('/home', homeController.loadHomepage);
router.get('/brands', brandController.getBrandsPage);
router.get('/deals', dealController.getDealsPage);
router.get('/support', supportController.getSupportPage);

// ==========================================
// Product SSR Routes
// ==========================================
router.get('/products', productController.getProductListing);
router.get('/products/:slug', productController.getProductDetails);

// ==========================================
// Cart Routes
// ==========================================
router.get('/cart', cartController.loadCart);

// ==========================================
// Wishlist Routes (Requires Auth)
// ==========================================
router.get('/wishlist', authenticateUser, requireUser, wishlistController.loadWishlist);

// ==========================================
// Checkout & Orders Routes (Requires Auth)
// ==========================================
router.get('/checkout', authenticateUser, requireUser, checkoutController.loadCheckout);
router.get('/orders', authenticateUser, requireUser, checkoutController.getOrders);
router.get('/orders/confirmation/:orderId', authenticateUser, requireUser, checkoutController.orderConfirmation);
router.get('/orders/:orderId', authenticateUser, requireUser, checkoutController.getOrderDetails);

// ==========================================
// User Profile Routes (Requires Auth)
// ==========================================
router.get('/profile', authenticateUser, requireUser, userController.loadProfile);
router.get('/profile/edit', authenticateUser, requireUser, userController.loadEditProfile);
router.get('/profile/addresses', authenticateUser, requireUser, userController.loadAddresses);
router.get('/wallet', authenticateUser, requireUser, userController.getWallet);
router.get('/profile/referrals', authenticateUser, requireUser, userController.loadReferrals);

// ==========================================
// Review Routes (Requires Auth)
// ==========================================
router.get('/products/:slug/reviews', getProductReviewsPage);
router.get('/profile/reviews', authenticateUser, requireUser, getUserReviewsPage);


export default router;
