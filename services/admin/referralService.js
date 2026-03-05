import User from '../../models/userSchema.js';
import ReferralConfig from '../../models/referralConfigSchema.js';

const getReferralPageData = async () => {
    // Get Config
    let config = await ReferralConfig.findOne();
    if (!config) {
        config = await ReferralConfig.create({});
    }

    // Get Referees 
    const referees = await User.find({ referredBy: { $ne: null } })
        .select('name email referredBy createdAt redeemed profile_picture')
        .sort({ createdAt: -1 })
        .lean();

    // Resolve Referrers
    // Get unique referral codes involved
    const referrerCodes = [...new Set(referees.map(r => r.referredBy).filter(c => c))];

    // Find users who own these codes
    const referrers = await User.find({ referralCode: { $in: referrerCodes } })
        .select('name email referralCode profile_picture')
        .lean();

    // Map code -> Referrer User
    const referrersMap = new Map();
    referrers.forEach(user => {
        if (user.referralCode)
            referrersMap.set(user.referralCode, user);
    });

    // Build Table Data
    const referralList = referees.map(referee => {
        const referrer = referrersMap.get(referee.referredBy);
        return {
            referee: referee,
            referrer: referrer || { name: `Unknown (Code: ${referee.referredBy})`, email: '', isUnknown: true },
            status: referee.redeemed ? 'Completed' : 'Pending',
            date: referee.createdAt,
            reward: config.referrerReward
        };
    });

    // Calculate Stats
    const totalReferrals = referees.length;
    const successfulReferrals = referees.filter(r => r.redeemed).length;
    const pendingReferrals = totalReferrals - successfulReferrals;
    // Calculate rewards distributed
    const totalRewards = successfulReferrals * (config.referrerReward + config.refereeReward);

    return {
        stats: {
            total: totalReferrals,
            successful: successfulReferrals,
            pending: pendingReferrals,
            rewards: totalRewards
        },
        referrals: referralList,
        config: config
    };
};

const updateReferralConfig = async (configData) => {
    const { referrerReward, refereeReward, status, description } = configData;

    let config = await ReferralConfig.findOne();
    if (!config) {
        config = new ReferralConfig();
    }

    config.referrerReward = Number(referrerReward) || 0;
    config.refereeReward = Number(refereeReward) || 0;
    config.status = status || 'active';
    config.description = description || '';

    await config.save();
    return config;
};

export default {
    getReferralPageData,
    updateReferralConfig
};
