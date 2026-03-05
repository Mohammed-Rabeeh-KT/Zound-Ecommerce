import brandService from '../../../services/user/brandService.js';
import { catchAsync } from '../../../utils/catchAsync.js';

const getBrandsPage = catchAsync(async (req, res, next) => {
    const { featuredBrands, regularBrands } = await brandService.getBrandsData();

    res.render('user/brands', {
        title: "Our Curated Brands",
        featuredBrands,
        allBrands: regularBrands,
        user: req.user
    });
});

export default { getBrandsPage };