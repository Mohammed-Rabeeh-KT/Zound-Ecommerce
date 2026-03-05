import express from "express";
const router = express.Router();

// SSR Controllers
import adminController from "../../controllers/admin/ssr/adminController.js";
import dashboardController from "../../controllers/admin/ssr/dashboardController.js";
import userManagementController from "../../controllers/admin/ssr/userManagementController.js";
import categoryController from "../../controllers/admin/ssr/categoryController.js";
import productController from "../../controllers/admin/ssr/productController.js";
import brandController from "../../controllers/admin/ssr/brandController.js";
import orderController from "../../controllers/admin/ssr/orderController.js";
import offerController from "../../controllers/admin/ssr/offerManagementController.js";
import couponController from "../../controllers/admin/ssr/couponController.js";
import referralController from "../../controllers/admin/ssr/referralController.js";
import salesReportController from "../../controllers/admin/ssr/salesReportController.js";
import paymentController from "../../controllers/admin/ssr/paymentController.js";
import { getReviewManagementPage, getReviewStats } from "../../controllers/admin/ssr/reviewManagementController.js";
import { getBannerManagementPage, getBannerStats, getProductsForBanner } from "../../controllers/admin/ssr/bannerManagementController.js";

import { catchAsync } from "../../utils/catchAsync.js";
import { protectAdmin } from "../../middlewares/auth/adminAuth.js";

// Set admin layout + inject adminName globally
router.use((req, res, next) => {
    res.locals.adminName = req.session.admin?.name || null;
    res.locals.layout = "adminLayout";
    next();
});

// AUTH ROUTES
router.get("/login", catchAsync(adminController.loadAdminLogin));
router.post("/login", catchAsync(adminController.loginAdmin));
router.get("/logout", catchAsync(adminController.logoutAdmin));

// Dashboard
router.get("/dashboard", protectAdmin, dashboardController.loadDashboard);

// USER MANAGEMENT
router.get("/users", protectAdmin, userManagementController.getUsersPage);

// CATEGORY MANAGEMENT
router.get("/categories", protectAdmin, categoryController.getCategoryPage);

// PRODUCT MANAGEMENT
router.get('/products', protectAdmin, productController.getProductPage);
router.get('/products/:id/details', protectAdmin, productController.getProductDetailsPage);

// ORDER MANAGEMENT
router.get("/orders", protectAdmin, orderController.getOrderManagement);
router.get("/orders/:orderId", protectAdmin, orderController.getOrderDetails);

// PAYMENT & REFUND MANAGEMENT
router.get("/payments", protectAdmin, paymentController.getPaymentPage);
router.get("/refunds", protectAdmin, paymentController.getRefundPage);

// BRAND MANAGEMENT 
router.get("/brands", protectAdmin, brandController.getBrandPage);

// OFFER MANAGEMENT
router.get("/offers", protectAdmin, offerController.getOfferManagement);

// REFERRAL MANAGEMENT
router.get("/referrals", protectAdmin, referralController.getReferralPage);
// NOTE: referral config update was in SSR controller. Keeping it here if it's form submit, but usually it should be API. Keeping it here to avoid breaking frontend.
router.post("/referrals/config", protectAdmin, referralController.updateReferralConfig);

// COUPON MANAGEMENT
router.get("/coupons", protectAdmin, couponController.getCoupons);

// SALES REPORT
router.get("/sales", protectAdmin, salesReportController.getSalesReportPage);

// REVIEW MANAGEMENT
router.get("/reviews", protectAdmin, getReviewManagementPage);
router.get("/reviews/stats", protectAdmin, getReviewStats);

// BANNER MANAGEMENT
router.get("/banners", protectAdmin, getBannerManagementPage);
router.get("/banners/stats", protectAdmin, getBannerStats);
router.get("/banners/products", protectAdmin, getProductsForBanner);

export default router;
