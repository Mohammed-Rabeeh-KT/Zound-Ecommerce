import express from 'express';
const router = express.Router();
import authController from '../controllers/user/authController.js';


// Google OAuth Login
router.get('/google',authController.googleLogin);

// Google OAuth callback
router.get('/google/callback',authController.googleCallback);

export default router;