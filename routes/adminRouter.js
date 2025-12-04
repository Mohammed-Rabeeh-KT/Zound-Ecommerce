import express from 'express';
const router = express.Router();
import adminController from '../controllers/admin/adminController.js';


router.get('/login', adminController.loadAdminLogin);
// router.post('/login', adminController.adminLogin);





export default router;

