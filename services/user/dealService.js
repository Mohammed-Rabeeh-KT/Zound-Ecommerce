import Offer from '../../models/offerSchema.js';

const getActiveDeals = async () => {
    const now = new Date();
    const activeOffers = await Offer.find({
        isActive: true,
        starts_at: { $lte: now },
        ends_at: { $gte: now }
    }).sort({ ends_at: 1 }).lean();

    return activeOffers;
};

export default { getActiveDeals };
