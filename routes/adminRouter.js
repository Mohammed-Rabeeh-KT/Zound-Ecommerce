import express from 'express';
const router = express.Router();
import adminController from '../controllers/admin/adminController.js';
import dashboardController from '../controllers/admin/dashboardController.js';
import { catchAsync } from '../utils/catchAsync.js';
import { protectAdmin } from '../middlewares/adminAuth.js';


router.get('/login', catchAsync(adminController.loadAdminLogin));
router.post('/login', catchAsync(adminController.loginAdmin));
router.get("/logout", catchAsync(adminController.logoutAdmin));

router.get("/dashboard", protectAdmin, dashboardController.loadDashboard);



export default router;

