import couponService from '../../../services/admin/couponService.js';
import { catchAsync } from '../../../utils/catchAsync.js';


const getCoupons = catchAsync(async (req, res, next) => {
    const coupons = await couponService.getAllCoupons();
    const now = new Date();

    const activeCoupons = coupons.filter(c => c.isActive && c.startDate <= now && c.endDate > now).length;
    const expiredCoupons = coupons.filter(c => c.endDate < now).length;
    const totalUsage = coupons.reduce((sum, c) => sum + c.usedCount, 0);
    const totalSavings = coupons.reduce((sum, c) => sum + (c.totalSavings || 0), 0);

    res.render('admin/couponManagement', {
        coupons,
        activeCoupons,
        expiredCoupons,
        totalUsage,
        totalSavings,
        adminName: req.user?.name || 'Admin',
        adminEmail: req.user?.email || ''
    });
});


export default {
    getCoupons
};
