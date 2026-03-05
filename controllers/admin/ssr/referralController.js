import { catchAsync } from "../../../utils/catchAsync.js";
import referralService from "../../../services/admin/referralService.js";

const getReferralPage = catchAsync(async (req, res, next) => {
    const data = await referralService.getReferralPageData();

    res.render('admin/referralManagement', {
        adminName: req.session.adminName || 'Admin',
        currentPage: 'referrals',
        ...data
    });
});

const updateReferralConfig = catchAsync(async (req, res, next) => {
    await referralService.updateReferralConfig(req.body);
    res.redirect('/admin/referrals');
});

export default {
    getReferralPage,
    updateReferralConfig
};
