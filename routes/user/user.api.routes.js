import express from 'express';
const router = express.Router();
import { authenticateUser } from '../../middlewares/auth/authMiddleware.js';
import uploadProfilePicture from '../../middlewares/upload/uploadProfilePicture.js';

// ==========================================
// Controllers (API)
// ==========================================
import authApiController from '../../controllers/user/api/authApiController.js';
import userApiController from '../../controllers/user/api/userApiController.js';
import cartApiController from '../../controllers/user/api/cartApiController.js';
import checkoutApiController from '../../controllers/user/api/checkoutApiController.js';
import paymentApiController from '../../controllers/user/api/paymentApiController.js';
import wishlistApiController from '../../controllers/user/api/wishlistApiController.js';
import reviewApiController from '../../controllers/user/api/reviewApiController.js';
import bannerManagementApiController from '../../controllers/admin/api/bannerManagementApiController.js';

// ==========================================
// Auth API Endpoints (Not protected)
// ==========================================
router.post('/login', authApiController.login);
router.post('/signup', authApiController.signup);
router.post('/verify-otp', authApiController.verifyOTP);
router.post('/resend-otp', authApiController.resendOTP);
router.post('/fp-verify-otp', authApiController.verifyFpOTP);
router.post('/fp-resend-otp', authApiController.resendFpOTP);
router.post('/fp-reset-password', authApiController.resetPassword);
router.get('/check-email', authApiController.checkEmail); // Utility

// ==========================================
// Protected User API routes
// ==========================================
// Apply authentication middleware to all subsequent routes
router.use(authenticateUser);

// Profile
router.put('/profile/edit', userApiController.updateProfile);
router.post('/send-email-otp', userApiController.sendEmailOtp);
router.post('/verify-email-otp', userApiController.verifyEmailOtp);
router.post('/change-password', userApiController.changePassword);
router.post('/upload-profile-picture', uploadProfilePicture.single('profileImage'), userApiController.uploadProfilePicture);

// Address API
router.post('/addresses', userApiController.addAddress);
router.put('/addresses/:id', userApiController.updateAddress);
router.delete('/addresses/:id', userApiController.deleteAddress);
router.get('/addresses/:id', userApiController.getAddress);
router.patch('/addresses/:id/default', userApiController.setDefaultAddress);

// Wallet API
router.post('/wallet/add-money', userApiController.addMoneyToWallet);
router.post('/wallet/verify-payment', userApiController.verifyWalletPayment);

// Cart API
router.get('/cart/count', cartApiController.getCartCount);
router.post('/cart/add', cartApiController.addToCart);
router.put('/cart/update', cartApiController.updateCartItem);
router.delete('/cart/clear', cartApiController.clearCart);
router.delete('/cart/remove-unavailable', cartApiController.removeUnavailableItems);
router.delete('/cart/remove/:productId', cartApiController.removeFromCart);
router.get('/cart/validate-stock', cartApiController.validateStock);

// Wishlist API
router.post('/wishlist/add', wishlistApiController.addToWishlist);
router.delete('/wishlist/remove/:productId', wishlistApiController.removeFromWishlist);
router.delete('/wishlist/clear', wishlistApiController.clearWishlist);
router.post('/wishlist/move-to-cart', wishlistApiController.moveToCart);

// Checkout & Orders API
router.post('/checkout/apply-coupon', checkoutApiController.applyCoupon);
router.post('/checkout/remove-coupon', checkoutApiController.removeCoupon);
router.get('/checkout/coupons', checkoutApiController.getAvailableCoupons);
router.post('/checkout/validate', checkoutApiController.validateOrder);
router.post('/checkout/place-order', checkoutApiController.placeOrder);

router.post('/orders/cancel', checkoutApiController.cancelOrderItems);
router.post('/orders/return', checkoutApiController.returnOrderItems);
router.get('/orders/search', checkoutApiController.searchOrders);
router.get('/orders/:orderId/invoice', checkoutApiController.downloadInvoice);

// Payment API
router.post('/payment/create-order', paymentApiController.createRazorpayOrder);
router.post('/payment/verify', paymentApiController.verifyPayment);
router.post('/payment/failed', paymentApiController.handlePaymentFailure);

// Review API
router.post('/reviews', reviewApiController.addReview);
router.get('/reviews/product/:productId', reviewApiController.getProductReviews);
router.get('/reviews/my-reviews', reviewApiController.getUserReviews);
router.put('/reviews/:reviewId', reviewApiController.updateReview);
router.delete('/reviews/:reviewId', reviewApiController.deleteReview);

// Banner API (public)
router.get('/banners/active', bannerManagementApiController.getActiveBanners);

export default router;
