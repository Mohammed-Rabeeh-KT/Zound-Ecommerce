import bannerManagementService from '../../../services/admin/bannerManagementService.js';

const bannerManagementApiController = {
    // Get all banners with filtering and pagination
    async getBanners(req, res, next) {
        try {
            const bannersData = await bannerManagementService.getBanners(req.query);

            res.status(200).json({
                success: true,
                data: bannersData
            });

        } catch (error) {
            next(error);
        }
    },

    // Get active banners for frontend
    async getActiveBanners(req, res, next) {
        try {
            const banners = await bannerManagementService.getActiveBanners();

            res.status(200).json({
                success: true,
                data: banners
            });

        } catch (error) {
            next(error);
        }
    },

    // Get banner by ID
    async getBannerById(req, res, next) {
        try {
            const { id } = req.params;
            const banner = await bannerManagementService.getBannerById(id);

            res.status(200).json({
                success: true,
                data: banner
            });

        } catch (error) {
            next(error);
        }
    },

    // Create new banner
    async createBanner(req, res, next) {
        try {
            const bannerData = req.body;
            const banner = await bannerManagementService.createBanner(bannerData);

            res.status(201).json({
                success: true,
                message: 'Banner created successfully',
                data: banner
            });

        } catch (error) {
            next(error);
        }
    },

    // Update banner
    async updateBanner(req, res, next) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const banner = await bannerManagementService.updateBanner(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Banner updated successfully',
                data: banner
            });

        } catch (error) {
            next(error);
        }
    },

    // Delete banner
    async deleteBanner(req, res, next) {
        try {
            const { id } = req.params;
            const result = await bannerManagementService.deleteBanner(id);

            res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            next(error);
        }
    },

    // Toggle banner status
    async toggleBannerStatus(req, res, next) {
        try {
            const { id } = req.params;
            const banner = await bannerManagementService.toggleBannerStatus(id);

            res.status(200).json({
                success: true,
                message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
                data: banner
            });

        } catch (error) {
            next(error);
        }
    },

    // Reorder banners
    async reorderBanners(req, res, next) {
        try {
            const { bannerOrders } = req.body;
            const result = await bannerManagementService.reorderBanners(bannerOrders);

            res.status(200).json({
                success: true,
                ...result
            });

        } catch (error) {
            next(error);
        }
    },

    // Get banner statistics
    async getBannerStats(req, res, next) {
        try {
            const stats = await bannerManagementService.getBannerStats();

            res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            next(error);
        }
    }
};

export default bannerManagementApiController;
