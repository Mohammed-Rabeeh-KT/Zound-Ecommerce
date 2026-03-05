import { catchAsync } from '../../../utils/catchAsync.js';

const getSupportPage = catchAsync(async (req, res, next) => {
    res.render('user/support', {
        title: "How Can We Help?",
        user: req.user
    });
});

export default { getSupportPage };
