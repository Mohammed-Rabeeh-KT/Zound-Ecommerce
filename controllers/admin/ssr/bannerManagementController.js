import { catchAsync } from "../../../utils/catchAsync.js";
import bannerManagementService from "../../../services/admin/bannerManagementService.js";

const getBannerManagementPage = catchAsync(async (req, res, next) => {
    const bannersData = await bannerManagementService.getBanners(req.query);

    if (req.xhr) {
        return res.json({
            banners: bannersData.banners,
            pagination: bannersData.pagination
        });
    }

    res.render("admin/bannerManagement", {
        banners: bannersData.banners,
        pagination: bannersData.pagination,
        search: req.query.search || '',
        isActive: req.query.isActive || '',
        currentPage: 'banners'
    });
});

const getBannerStats = catchAsync(async (req, res, next) => {
    const stats = await bannerManagementService.getBannerStats();
    
    res.json({
        success: true,
        data: stats
    });
});

const getProductsForBanner = catchAsync(async (req, res, next) => {
    const products = await bannerManagementService.getProductsForBanner();
    
    res.json({
        success: true,
        data: products
    });
});

export {
    getBannerManagementPage,
    getBannerStats,
    getProductsForBanner
};
