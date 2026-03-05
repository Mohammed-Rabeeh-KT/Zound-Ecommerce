import express from "express";
const router = express.Router();

// API Controllers
import dashboardApiController from "../../controllers/admin/api/dashboardApiController.js";
import userManagementApiController from "../../controllers/admin/api/userManagementApiController.js";
import categoryApiController from "../../controllers/admin/api/categoryApiController.js";
import productApiController from "../../controllers/admin/api/productApiController.js";
import brandApiController from "../../controllers/admin/api/brandApiController.js";
import orderApiController from "../../controllers/admin/api/orderApiController.js";
import offerApiController from "../../controllers/admin/api/offerApiController.js";
import couponApiController from "../../controllers/admin/api/couponApiController.js";
import salesReportApiController from "../../controllers/admin/api/salesReportApiController.js";
import reviewManagementApiController from "../../controllers/admin/api/reviewManagementApiController.js";
import bannerManagementApiController from "../../controllers/admin/api/bannerManagementApiController.js";

import { protectAdmin } from "../../middlewares/auth/adminAuth.js";
import uploadBrandLogo from "../../middlewares/upload/uploadBrandLogo.js";
import uploadProductImage from "../../middlewares/upload/uploadProductImage.js";

// All admin APIs are protected
router.use(protectAdmin);

// Dashboard
router.get("/dashboard/chart-data", dashboardApiController.getDashboardChartData);
router.get("/dashboard/best-selling", dashboardApiController.getBestSellingData);
router.get("/dashboard/ledger", dashboardApiController.generateLedgerBook);

// USER MANAGEMENT
router.get("/users/data", userManagementApiController.getUsersData);
router.patch("/users/block/:id", userManagementApiController.blockUser);
router.patch("/users/unblock/:id", userManagementApiController.unblockUser);

// CATEGORY MANAGEMENT
router.get("/categories/data", categoryApiController.getCategoriesData);
router.post("/categories/add", categoryApiController.addCategory);
router.patch("/categories/update/:id", categoryApiController.updateCategory);
router.patch("/categories/delete/:id", categoryApiController.unlistCategory);
router.patch("/categories/toggle-status/:id", categoryApiController.toggleListCategory);

// PRODUCT MANAGEMENT
router.post('/products', uploadProductImage.any(), productApiController.addProduct);
router.get('/products/search', offerApiController.searchProducts);
router.get('/products/:id', productApiController.getProductById);
router.put('/products/:id', uploadProductImage.any(), productApiController.updateProduct);
router.patch('/products/:id/toggle', productApiController.toggleProductStatus);
router.delete('/products/:id', productApiController.softDeleteProduct);
router.post('/product/variant/delete', productApiController.deleteVariant);
router.post('/product/variant/toggle', productApiController.toggleVariantStatus);

// ORDER MANAGEMENT
router.post("/orders/update-status", orderApiController.updateOrderStatus);
router.post("/orders/return-request", orderApiController.handleReturnRequest);
router.post("/orders/update-item-status", orderApiController.updateItemStatus);

// BRAND MANAGEMENT 
router.get("/brands/data", brandApiController.getBrandsData);
router.post("/brands", uploadBrandLogo.single("logo"), brandApiController.addBrand);
router.get("/brands/:id", brandApiController.getBrandById);
router.patch("/brands/update/:id", uploadBrandLogo.single("logo"), brandApiController.updateBrand);
router.patch("/brands/:id/toggle", brandApiController.toggleBrandStatus);

// OFFER MANAGEMENT
router.post("/offers/product/add", offerApiController.addProductOffer);
router.post("/offers/category/add", offerApiController.addCategoryOffer);
router.post("/offers/brand/add", offerApiController.addBrandOffer);
router.delete("/offers/:type/:offerId", offerApiController.deleteOffer);
router.patch("/offers/:offerId/toggle", offerApiController.toggleOfferStatus);
router.put("/offers/:offerId", offerApiController.updateOffer);

// COUPON MANAGEMENT
router.get("/coupons/:id", couponApiController.getCouponById);
router.post("/coupons", couponApiController.createCoupon);
router.put("/coupons/:id", couponApiController.updateCoupon);
router.patch("/coupons/:id/toggle", couponApiController.toggleCouponStatus);
router.delete("/coupons/:id", couponApiController.deleteCoupon);

// SALES REPORT
router.get("/sales/data", salesReportApiController.getSalesData);
router.get("/sales/products", salesReportApiController.getProducts);

// REVIEW MANAGEMENT
router.get("/reviews", reviewManagementApiController.getReviews);
router.get("/reviews/stats", reviewManagementApiController.getReviewStats);
router.get("/reviews/:id", reviewManagementApiController.getReviewById);
router.patch("/reviews/:id/approve", reviewManagementApiController.approveReview);
router.patch("/reviews/:id/reject", reviewManagementApiController.rejectReview);
router.put("/reviews/:id", reviewManagementApiController.updateReview);
router.delete("/reviews/:id", reviewManagementApiController.deleteReview);
router.post("/reviews/bulk-approve", reviewManagementApiController.bulkApprove);
router.post("/reviews/bulk-reject", reviewManagementApiController.bulkReject);

// BANNER MANAGEMENT
router.get("/banners", bannerManagementApiController.getBanners);
router.get("/banners/active", bannerManagementApiController.getActiveBanners);
router.get("/banners/stats", bannerManagementApiController.getBannerStats);
router.get("/banners/:id", bannerManagementApiController.getBannerById);
router.post("/banners", bannerManagementApiController.createBanner);
router.put("/banners/:id", bannerManagementApiController.updateBanner);
router.delete("/banners/:id", bannerManagementApiController.deleteBanner);
router.patch("/banners/:id/toggle", bannerManagementApiController.toggleBannerStatus);
router.put("/banners/reorder", bannerManagementApiController.reorderBanners);

export default router;
