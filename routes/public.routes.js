import express from 'express';
const router = express.Router();

import homeController from '../controllers/user/ssr/homeController.js';
import brandController from '../controllers/user/ssr/brandController.js';
import dealController from '../controllers/user/ssr/dealController.js';
import supportController from '../controllers/user/ssr/supportController.js';

// Homepage & Static SSR Routes
router.get('/', homeController.loadHomepage);
router.get('/brands', brandController.getBrandsPage);
router.get('/deals', dealController.getDealsPage);
router.get('/support', supportController.getSupportPage);

export default router;
