import Brand from "../../models/brandSchema.js";
import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";
import slugify from "slugify";

const getBrandsList = async (page = 1, limit = 10, search = "", status = "") => {
    const skip = (page - 1) * limit;

    const filter = {};
    if (search) filter.brandName = { $regex: search, $options: "i" };
    if (status === "listed") filter.isListed = true;
    if (status === "unlisted") filter.isListed = false;

    const totalBrands = await Brand.countDocuments(filter);
    const totalPages = Math.ceil(totalBrands / limit) || 1;

    const brands = await Brand.aggregate([
        { $match: filter },
        {
            $lookup: {
                from: "products",
                let: { brandId: "$_id" },
                pipeline: [{
                    $match: {
                        $expr: {
                            $and: [
                                { $eq: ["$brand", "$$brandId"] },
                                { $eq: ["$isDeleted", false] }
                            ]
                        }
                    }
                }],
                as: "products"
            }
        },
        {
            $addFields: {
                productCount: {
                    $size: "$products"
                }
            }
        },
        { $project: { products: 0 } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
    ]);

    return {
        brands,
        pagination: { page, totalPages, totalBrands, limit }
    };
};

const addBrand = async (brandData) => {
    const { brandName, isListed, logoPath } = brandData;

    if (!brandName?.trim()) {
        throw new AppError("Brand name is required", STATUS.BAD_REQUEST);
    }

    const trimmedName = brandName.trim();
    if (trimmedName.length < 2) {
        throw new AppError("Brand name must be at least 2 characters long", STATUS.BAD_REQUEST);
    }

    if (trimmedName.length > 50) {
        throw new AppError("Brand name cannot exceed 50 characters", STATUS.BAD_REQUEST);
    }

    const existing = await Brand.findOne({
        brandName: { $regex: new RegExp(`^${trimmedName}$`, "i") }
    });

    if (existing) {
        throw new AppError(`Brand "${trimmedName}" already exists. Please choose a different name.`, STATUS.CONFLICT);
    }

    if (!logoPath) {
        throw new AppError("Brand logo is required", STATUS.BAD_REQUEST);
    }

    const brand = await Brand.create({
        brandName: trimmedName,
        slug: slugify(trimmedName, { lower: true, strict: true, trim: true }),
        logo: logoPath,
        isListed: isListed === "on"
    });

    return brand;
};

const getBrandById = async (brandId) => {
    const brand = await Brand.findById(brandId);
    if (!brand) throw new AppError("Brand not found", STATUS.NOT_FOUND);
    return brand;
};

const updateBrand = async (brandId, brandData) => {
    const { brandName, isListed, logoPath } = brandData;

    const brand = await Brand.findById(brandId);
    if (!brand) throw new AppError("Brand not found", STATUS.NOT_FOUND);

    if (brandName && brandName.trim()) {
        const trimmedName = brandName.trim();
        
        if (trimmedName.length < 2) {
            throw new AppError("Brand name must be at least 2 characters long", STATUS.BAD_REQUEST);
        }

        if (trimmedName.length > 50) {
            throw new AppError("Brand name cannot exceed 50 characters", STATUS.BAD_REQUEST);
        }

        const duplicate = await Brand.findOne({
            brandName: { $regex: new RegExp(`^${trimmedName}$`, "i") },
            _id: { $ne: brandId }
        });

        if (duplicate) {
            throw new AppError(`Brand "${trimmedName}" already exists. Please choose a different name.`, STATUS.CONFLICT);
        }

        brand.brandName = trimmedName;
        brand.slug = slugify(trimmedName, { lower: true, strict: true, trim: true });
    }

    brand.isListed = isListed === "on";

    if (logoPath) {
        brand.logo = logoPath;
    }

    await brand.save();

    return brand;
};

const toggleBrandStatus = async (brandId) => {
    const brand = await Brand.findById(brandId);
    if (!brand) throw new AppError("Brand not found", STATUS.NOT_FOUND);

    brand.isListed = !brand.isListed;
    await brand.save();

    return brand;
};

export default {
    getBrandsList,
    addBrand,
    getBrandById,
    updateBrand,
    toggleBrandStatus
};
