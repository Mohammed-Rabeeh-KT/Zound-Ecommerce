import express from 'express';
const router = express.Router();
import authController from '../controllers/user/ssr/authController.js';

// Google OAuth Routes (at root level)
router.get('/google', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);

export default router;
