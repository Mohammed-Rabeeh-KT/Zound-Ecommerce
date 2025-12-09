import express from 'express';
const router = express.Router();
import multer from "multer";
import adminController from '../controllers/admin/adminController.js';
import dashboardController from '../controllers/admin/dashboardController.js';
import userManagementController from '../controllers/admin/userManagementController.js';
import categoryController from '../controllers/admin/categoryController.js'
import { catchAsync } from '../utils/catchAsync.js';
import { protectAdmin } from '../middlewares/adminAuth.js';
const upload = multer();


router.use((req, res, next) => {
    if (req.session.admin) {
        res.locals.adminName = req.session.admin.name; 
    } else {
        res.locals.adminName = null;
    }

    res.locals.layout = "adminLayout";
    next();
});


router.get('/login', catchAsync(adminController.loadAdminLogin));
router.post('/login', catchAsync(adminController.loginAdmin));
router.get("/logout", catchAsync(adminController.logoutAdmin));

router.get("/dashboard", protectAdmin, dashboardController.loadDashboard);

// USER MANAGEMENT ROUTES

router.get("/users", protectAdmin, userManagementController.getUsersPage);
router.get('/users/data',protectAdmin,userManagementController.getUsersData)
router.patch("/users/block/:id", userManagementController.blockUser);
router.patch("/users/unblock/:id", userManagementController.unblockUser);

// CATEGORY ROUTES
router.get("/categories", categoryController.getCategoryPage); 
router.get("/categories/data", categoryController.getCategoriesData);

router.post("/categories/add", upload.none(), categoryController.addCategory);
router.put("/categories/update/:id", upload.none(), categoryController.updateCategory);
router.patch("/categories/delete/:id", categoryController.unlistCategory);
router.patch("/categories/toggle-status/:id", categoryController.toggleListCategory);


export default router;

