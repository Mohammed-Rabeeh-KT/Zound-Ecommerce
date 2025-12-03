import express from 'express';
const router = express.Router();
import userController from '../controllers/user/userController.js';
import authController from '../controllers/user/authController.js';
import { authenticateUser, requireAuth, requireNoAuth } from '../middlewares/authMiddleware.js';


router.get('/pageNotFound', userController.pageNotFound)
router.get('/home', userController.loadHomepage)

// AUTH ROUTES
router.get('/login', requireNoAuth, authController.loadLogin)
router.post('/login', authController.login)

router.get('/signup', requireNoAuth, authController.loadSignup)
router.post('/signup', authController.signup)
router.post('/verify-otp', authController.verifyOTP)
router.post('/resend-otp', authController.resendOTP)

router.post("/logout", requireAuth, authController.logout);

// AJAX email validation
router.post('/check-email', authController.checkEmail);

router.get('/forgot-password', authController.loadForgotPassword)
router.post('/forgot-password', authController.forgotPassword);
router.post('/fp-resend-otp', authController.resendFpOTP);
router.get('/fp-verify-otp', authController.loadFpVerifyOTP);
router.post('/fp-verify-otp', authController.verifyFpOTP);
router.get('/fp-reset-password', authController.loadResetPassword);
router.post('/fp-reset-password', authController.resetPassword);


export default router;
