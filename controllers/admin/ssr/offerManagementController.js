import { catchAsync } from "../../../utils/catchAsync.js";
import offerService from "../../../services/admin/offerService.js";

const getOfferManagement = catchAsync(async (req, res, next) => {
    const data = await offerService.getOfferManagementPageData();

    res.render('admin/offerManagement', {
        ...data,
        adminName: req.session.adminName || 'Admin',
        adminEmail: req.session.adminEmail || '',
        currentPage: 'offers'
    });
});

// UPDATE REFERRAL CONFIGURATION (legacy mock, keeping intact for reference but ideally moved to referral)
const updateReferralConfig = catchAsync(async (req, res, next) => {
    const { referrerReward, refereeReward, description } = req.body;

    // In production, store this in a Settings collection
    console.log('Referral Config Updated:', { referrerReward, refereeReward, description });

    res.redirect('/admin/offers');
});

export default {
    getOfferManagement,
    updateReferralConfig,
    getBestOfferForProduct: offerService.getBestOfferForProduct,
    calculateOfferPrice: offerService.calculateOfferPrice,
};