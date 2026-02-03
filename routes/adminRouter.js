import express from "express";
const router = express.Router();

import adminController from "../controllers/admin/adminController.js";
import dashboardController from "../controllers/admin/dashboardController.js";
import userManagementController from "../controllers/admin/userManagementController.js";
import categoryController from "../controllers/admin/categoryController.js";
import productController from "../controllers/admin/productController.js";
import brandController from "../controllers/admin/brandController.js";
import orderController from "../controllers/admin/orderController.js";
import offerController from "../controllers/admin/offerManagementController.js";

import { catchAsync } from "../utils/catchAsync.js";
import { protectAdmin } from "../middlewares/adminAuth.js";
import uploadBrandLogo from "../middlewares/uploadBrandLogo.js";
import uploadProductImage from "../middlewares/uploadProductImage.js";


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
router.get("/users/data", protectAdmin, userManagementController.getUsersData);
router.patch("/users/block/:id", userManagementController.blockUser);
router.patch("/users/unblock/:id", userManagementController.unblockUser);

// CATEGORY MANAGEMENT
router.get("/categories", categoryController.getCategoryPage);
router.get("/categories/data", categoryController.getCategoriesData);

router.post("/categories/add", categoryController.addCategory);
router.patch("/categories/update/:id", categoryController.updateCategory);
router.patch("/categories/delete/:id", categoryController.unlistCategory);
router.patch("/categories/toggle-status/:id", categoryController.toggleListCategory);

// PRODUCT MANAGEMENT
router.get('/products', productController.getProductPage);
router.get('/products/:id/details', productController.getProductDetailsPage);

// API Actions
router.post('/products',
  uploadProductImage.any(),
  productController.addProduct
);

// Product search for autocomplete (must be before /products/:id)
router.get('/products/search', offerController.searchProducts);

router.get('/products/:id', productController.getProductById);

router.put('/products/:id',
  uploadProductImage.any(),
  productController.updateProduct
);

router.patch('/products/:id/toggle', productController.toggleProductStatus);
router.delete('/products/:id', productController.softDeleteProduct);
router.post('/product/variant/delete', productController.deleteVariant);
router.post('/product/variant/toggle', productController.toggleVariantStatus);

// ORDER MANAGEMENT
router.get("/orders", orderController.getOrderManagement);
router.post("/orders/update-status", orderController.updateOrderStatus);
router.post("/orders/return-request", orderController.handleReturnRequest);
router.post("/orders/update-item-status", orderController.updateItemStatus);
router.get("/orders/:orderId", orderController.getOrderDetails);

// BRAND MANAGEMENT 
router.get("/brands", brandController.getBrandPage);
router.get("/brands/data", brandController.getBrandsData);
router.post(
  "/brands",
  uploadBrandLogo.single("logo"),
  brandController.addBrand
);
router.get("/brands/:id", brandController.getBrandById);
router.patch(
  "/brands/update/:id",
  uploadBrandLogo.single("logo"),
  brandController.updateBrand
);
router.patch("/brands/:id/toggle", brandController.toggleBrandStatus);

// OFFER MANAGEMENT
router.get("/offers", offerController.getOfferManagement);
router.post("/offers/product/add", offerController.addProductOffer);
router.post("/offers/category/add", offerController.addCategoryOffer);
router.post("/offers/brand/add", offerController.addBrandOffer);
router.delete("/offers/:type/:offerId", offerController.deleteOffer);
router.post("/referrals/update", offerController.updateReferralConfig);
router.patch("/offers/:offerId/toggle", offerController.toggleOfferStatus);
router.put("/offers/:offerId", offerController.updateOffer);


export default router;
