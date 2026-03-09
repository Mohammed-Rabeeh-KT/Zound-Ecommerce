import Banner from '../../models/bannerSchema.js';
import Product from '../../models/productSchema.js';
import AppError from '../../utils/AppError.js';
import { STATUS } from '../../utils/response.js';

// Helper function to validate ObjectId
const validateObjectId = (id, fieldName = 'ID') => {
    if (!id || typeof id !== 'string') {
        throw new AppError(`Invalid ${fieldName} format`, STATUS.BAD_REQUEST);
    }

    const objectIdPattern = /^[0-9a-fA-F]{24}$/;
    if (!objectIdPattern.test(id)) {
        throw new AppError(`Invalid ${fieldName} format`, STATUS.BAD_REQUEST);
    }

    return true;
};

const bannerManagementService = {
    // Get all banners with filtering and pagination
    async getBanners(query = {}) {
        const {
            page = 1,
            limit = 10,
            isActive,
            productId,
            search
        } = query;

        // Build filter
        const filter = {};

        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (productId) filter.product = productId;

        // Search by title, subtitle, or description
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { subtitle: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const banners = await Banner.find(filter)
            .sort({ order: 1, createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Banner.countDocuments(filter);

        return {
            banners,
            pagination: {
                current: page,
                pages: Math.ceil(total / limit),
                total
            }
        };
    },

    // Get active banners for frontend
    async getActiveBanners() {
        const now = new Date();

        const banners = await Banner.find({
            isActive: true,
            $or: [
                { endDate: { $exists: false } },
                { endDate: null },
                { endDate: { $gt: now } }
            ],
            startDate: { $lte: now }
        })
            .sort({ order: 1, createdAt: -1 });

        return banners;
    },

    // Get banner by ID
    async getBannerById(id) {
        validateObjectId(id, 'banner ID');

        const banner = await Banner.findById(id);

        if (!banner) {
            throw new AppError('Banner not found', STATUS.NOT_FOUND);
        }

        return banner;
    },

    // Create new banner
    async createBanner(bannerData) {
        const {
            title,
            subtitle,
            description,
            image,
            buttonText,
            buttonLink,
            isActive,
            order,
            startDate,
            endDate
        } = bannerData;

        // Title validation
        const trimmedTitle = title?.trim();
        if (!trimmedTitle) {
            throw new AppError('Banner title is required', STATUS.BAD_REQUEST);
        }

        if (trimmedTitle.length < 3) {
            throw new AppError('Banner title must be at least 3 characters long', STATUS.BAD_REQUEST);
        }

        if (trimmedTitle.length > 100) {
            throw new AppError('Banner title cannot exceed 100 characters', STATUS.BAD_REQUEST);
        }

        // Subtitle validation (optional but if provided, must be valid)
        if (subtitle) {
            const trimmedSubtitle = subtitle.trim();
            if (trimmedSubtitle.length > 150) {
                throw new AppError('Banner subtitle cannot exceed 150 characters', STATUS.BAD_REQUEST);
            }
        }

        // Description validation (optional but if provided, must be valid)
        if (description) {
            const trimmedDescription = description.trim();
            if (trimmedDescription.length > 500) {
                throw new AppError('Banner description cannot exceed 500 characters', STATUS.BAD_REQUEST);
            }
        }

        // Image validation
        if (!image) {
            throw new AppError('Banner image is required', STATUS.BAD_REQUEST);
        }

        // Button text validation (optional but if provided, must be valid)
        if (buttonText) {
            const trimmedButtonText = buttonText.trim();
            if (trimmedButtonText.length > 30) {
                throw new AppError('Button text cannot exceed 30 characters', STATUS.BAD_REQUEST);
            }
        }

        // Button link validation (optional but if provided, must be valid)
        if (buttonLink) {
            const trimmedButtonLink = buttonLink.trim();
            if (trimmedButtonLink.length > 500) {
                throw new AppError('Button link cannot exceed 500 characters', STATUS.BAD_REQUEST);
            }

            // Basic URL validation
            try {
                new URL(trimmedButtonLink);
            } catch (error) {
                throw new AppError('Button link must be a valid URL', STATUS.BAD_REQUEST);
            }
        }

        // Order validation
        const orderNum = parseInt(order) || 0;
        if (orderNum < 0) {
            throw new AppError('Banner order cannot be negative', STATUS.BAD_REQUEST);
        }

        if (orderNum > 999) {
            throw new AppError('Banner order cannot exceed 999', STATUS.BAD_REQUEST);
        }

        const existingOrder = await Banner.findOne({ order: orderNum });
        if (existingOrder) {
            throw new AppError(`Order number ${orderNum} is already assigned to another banner. Please choose a different order.`, STATUS.BAD_REQUEST);
        }

        // Date validation
        const now = new Date();
        let start = now;
        let end = null;

        if (startDate) {
            start = new Date(startDate);
            if (isNaN(start.getTime())) {
                throw new AppError('Invalid start date format', STATUS.BAD_REQUEST);
            }
        }

        if (endDate) {
            end = new Date(endDate);
            if (isNaN(end.getTime())) {
                throw new AppError('Invalid end date format', STATUS.BAD_REQUEST);
            }

            if (end <= start) {
                throw new AppError('End date must be after start date', STATUS.BAD_REQUEST);
            }

            if (end < now) {
                throw new AppError('End date cannot be in the past', STATUS.BAD_REQUEST);
            }
        }

        // Create banner
        const banner = await Banner.create({
            title: trimmedTitle,
            subtitle: subtitle?.trim() || '',
            description: description?.trim() || '',
            image,
            buttonText: buttonText?.trim() || '',
            buttonLink: buttonLink?.trim() || '',
            isActive: isActive === 'true' || isActive === true,
            order: orderNum,
            startDate: start,
            endDate: end
        });

        return banner;
    },

    // Update banner
    async updateBanner(id, updateData) {
        validateObjectId(id, 'banner ID');

        const banner = await Banner.findById(id);
        if (!banner) {
            throw new AppError('Banner not found', STATUS.NOT_FOUND);
        }

        // Update fields
        if (updateData.title !== undefined) banner.title = updateData.title;
        if (updateData.subtitle !== undefined) banner.subtitle = updateData.subtitle;
        if (updateData.description !== undefined) banner.description = updateData.description;
        if (updateData.image !== undefined) banner.image = updateData.image;
        if (updateData.buttonText !== undefined) banner.buttonText = updateData.buttonText;
        if (updateData.buttonLink !== undefined) banner.buttonLink = updateData.buttonLink;
        if (updateData.isActive !== undefined) banner.isActive = updateData.isActive;

        if (updateData.order !== undefined) {
            const orderNum = parseInt(updateData.order) || 0;
            if (orderNum < 0 || orderNum > 999) {
                throw new AppError('Banner order must be between 0 and 999', STATUS.BAD_REQUEST);
            }
            if (orderNum !== banner.order) {
                const existingOrder = await Banner.findOne({ order: orderNum, _id: { $ne: banner._id } });
                if (existingOrder) {
                    throw new AppError(`Order number ${orderNum} is already assigned to another banner. Please choose a different order.`, STATUS.BAD_REQUEST);
                }
            }
            banner.order = orderNum;
        }

        if (updateData.startDate !== undefined) banner.startDate = new Date(updateData.startDate);
        if (updateData.endDate !== undefined) banner.endDate = updateData.endDate ? new Date(updateData.endDate) : undefined;

        await banner.save();

        const populatedBanner = await Banner.findById(banner._id);

        return populatedBanner;
    },

    // Delete banner
    async deleteBanner(id) {
        validateObjectId(id, 'banner ID');

        const banner = await Banner.findById(id);
        if (!banner) {
            throw new AppError('Banner not found', STATUS.NOT_FOUND);
        }

        await Banner.findByIdAndDelete(id);

        return { message: 'Banner deleted successfully' };
    },

    // Toggle banner status
    async toggleBannerStatus(id) {
        validateObjectId(id, 'banner ID');

        const banner = await Banner.findById(id);
        if (!banner) {
            throw new AppError('Banner not found', STATUS.NOT_FOUND);
        }

        banner.isActive = !banner.isActive;
        await banner.save();

        return banner;
    },

    // Reorder banners
    async reorderBanners(bannerOrders) {
        if (!bannerOrders || !Array.isArray(bannerOrders)) {
            throw new AppError('Banner orders array is required', STATUS.BAD_REQUEST);
        }

        // Validate all IDs in the array
        for (const item of bannerOrders) {
            validateObjectId(item.id, 'banner ID in reorder data');

            if (typeof item.order !== 'number') {
                throw new AppError('Invalid order value in reorder data', STATUS.BAD_REQUEST);
            }
        }

        const updatePromises = bannerOrders.map(({ id, order }) =>
            Banner.findByIdAndUpdate(id, { order })
        );

        await Promise.all(updatePromises);

        return { message: 'Banners reordered successfully' };
    },

    // Get banner statistics
    async getBannerStats() {
        const total = await Banner.countDocuments();
        const active = await Banner.countDocuments({ isActive: true });
        const inactive = total - active;

        const now = new Date();
        const expired = await Banner.countDocuments({
            endDate: { $lt: now }
        });

        return {
            total,
            active,
            inactive,
            expired
        };
    },

};

export default bannerManagementService;
