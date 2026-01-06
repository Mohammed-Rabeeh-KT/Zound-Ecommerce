import express from 'express';
const router = express.Router();
import userController from '../controllers/user/userController.js';
import authController from '../controllers/user/authController.js';
import productController from '../controllers/user/productController.js'
import { authenticateUser, requireUser, requireAdmin } from '../middlewares/authMiddleware.js';
import uploadProfilePicture from '../middlewares/uploadProfilePicture.js';


router.get('/pageNotFound', userController.pageNotFound)
router.get('/home', userController.loadHomepage)

// AUTH ROUTES
router.get('/login', authController.loadLogin)
router.post('/login', authController.login)

router.get('/signup', authController.loadSignup)
router.post('/signup', authController.signup)
router.post('/verify-otp', authController.verifyOTP)
router.post('/resend-otp', authController.resendOTP)

router.post("/logout", authController.logout);

// AJAX email validation
router.post('/check-email', authController.checkEmail);

router.get('/forgot-password', authController.loadForgotPassword)
router.post('/forgot-password', authController.forgotPassword);
router.post('/fp-resend-otp', authController.resendFpOTP);
router.get('/fp-verify-otp', authController.loadFpVerifyOTP);
router.post('/fp-verify-otp', authController.verifyFpOTP);
router.get('/fp-reset-password', authController.loadResetPassword);
router.post('/fp-reset-password', authController.resetPassword);



//Product Listing
router.get('/products', productController.getProductListing)


//product detail page
router.get('/products/:slug', productController.getProductDetails)


//User Profile Routes
router.get('/profile', userController.loadProfile)

//edit profile
router.get('/profile/edit', userController.loadEditProfile);
router.put('/profile/edit', userController.updateProfile)

// OTP Verification Routes (API endpoints)
router.post('/send-email-otp', userController.sendEmailOtp);
router.post('/verify-email-otp', userController.verifyEmailOtp);

// Change Password Route
router.post('/change-password', userController.changePassword);

// Profile Picture Upload Route
router.post('/upload-profile-picture', uploadProfilePicture.single('profileImage'), userController.uploadProfilePicture);

// Address Routes
router.get('/profile/addresses', userController.loadAddresses);
router.post('/addresses', userController.addAddress);
router.put('/addresses/:id', userController.updateAddress);
router.put('/addresses/:id/default', userController.setDefaultAddress);
router.delete('/addresses/:id', userController.deleteAddress);

export default router;
