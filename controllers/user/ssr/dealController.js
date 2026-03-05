import dealService from '../../../services/user/dealService.js';
import { catchAsync } from '../../../utils/catchAsync.js';

const getDealsPage = catchAsync(async (req, res, next) => {
    const activeOffers = await dealService.getActiveDeals();

    res.render('user/deals', {
        title: "Exclusive Deals & Offers",
        activeOffers,
        user: req.user
    });
});

export default { getDealsPage };
