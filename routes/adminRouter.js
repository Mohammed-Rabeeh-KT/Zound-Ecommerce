import express from "express";
const router = express.Router();

import adminController from "../controllers/admin/adminController.js";
import dashboardController from "../controllers/admin/dashboardController.js";
import userManagementController from "../controllers/admin/userManagementController.js";
import categoryController from "../controllers/admin/categoryController.js";
import productController from "../controllers/admin/productController.js";
import brandController from "../controllers/admin/brandController.js";

import { catchAsync } from "../utils/catchAsync.js";
import { protectAdmin } from "../middlewares/adminAuth.js";
import uploadBrandLogo from "../middlewares/uploadBrandLogo.js";

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
router.get("/products", productController.getProducts);
// router.get("/products/data", productController.getProductsData); 

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

export default router;
