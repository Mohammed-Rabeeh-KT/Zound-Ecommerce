import express from 'express';
const router = express.Router();
import adminController from '../controllers/admin/adminController.js';
import dashboardController from '../controllers/admin/dashboardController.js';
import userManagementController from '../controllers/admin/userManagementController.js';
import { catchAsync } from '../utils/catchAsync.js';
import { protectAdmin } from '../middlewares/adminAuth.js';


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

router.get("/users", protectAdmin, userManagementController.getUsersPage);
router.get('/users/data',protectAdmin,userManagementController.getUsersData)
router.patch("/users/block/:id", userManagementController.blockUser);
router.patch("/users/unblock/:id", userManagementController.unblockUser);



export default router;

