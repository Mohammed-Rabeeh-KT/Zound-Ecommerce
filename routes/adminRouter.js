import express from 'express';
const router = express.Router();
import adminController from '../controllers/admin/adminController.js';
import { catchAsync } from '../utils/catchAsync.js';


router.get('/login', catchAsync(adminController.loadAdminLogin));
router.post('/login', catchAsync(adminController.loginAdmin));
router.get("/logout", catchAsync(adminController.logoutAdmin));

// router.get("/dashboard", protectAdmin, dashboardController);



export default router;

