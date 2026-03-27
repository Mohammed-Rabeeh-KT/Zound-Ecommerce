import { catchAsync } from "../../../utils/catchAsync.js";
import userService from "../../../services/user/userService.js";

// Load Profile
const loadProfile = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const user = await userService.getProfileData(userId);

    res.render("user/profile", {
        user: user,
        currentPage: "profile"
    });
});

// Load Edit Profile Page
const loadEditProfile = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const user = await userService.getProfileData(userId);

    res.render('user/editProfile', {
        user,
        currentPage: 'profile'
    });
});

// Load Addresses Page
const loadAddresses = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const addresses = await userService.getAddresses(userId);

    res.render('user/addresses', {
        user: req.user,
        addresses: addresses,
        currentPage: 'addresses'
    });
});

// Load Wallet Page
const getWallet = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;

    const data = await userService.getWalletData(userId, page);

    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.json({
            transactions: data.walletHistory,
            pagination: data.pagination
        });
    }

    res.render('user/wallet', {
        user: data.user,
        walletHistory: data.walletHistory,
        pagination: data.pagination,
        currentPage: 'wallet'
    });
});

// Load Referrals Page
const loadReferrals = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    const data = await userService.getReferralPageData(userId);

    res.render('user/referrals', {
        user: data.user,
        layout: 'layout',
        referralCode: data.referralCode,
        stats: data.stats,
        referees: data.referees,
        config: data.config,
        currentPage: 'referrals'
    });
});

export default {
    loadProfile,
    loadEditProfile,
    loadAddresses,
    getWallet,
    loadReferrals
};
