import Brand from "../../models/brandSchema.js";
import Product from "../../models/productSchema.js";
import slugify from "slugify";
import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import { successResponse, STATUS } from "../../utils/response.js";


/* ===========================================================
   LOAD BRAND PAGE (EJS)
=========================================================== */
const getBrandPage = catchAsync(async (req, res) => {
    const { search = "", status = "" } = req.query;
    res.render("admin/brandManagement", {
        currentPage: "brands",
        adminName: req.session.admin?.name || "Admin",
        search,
        status
    });
});

/* ===========================================================
   FETCH BRANDS (AJAX)
=========================================================== */
const getBrandsData = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const status = req.query.status || "";

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

        { $project: { products: 0 } }, // remove heavy array
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
    ]);


    return successResponse(res, STATUS.OK, "Brands fetched", {
        brands,
        pagination: { page, totalPages, totalBrands, limit }
    });
});

/* ===========================================================
   ADD NEW BRAND
=========================================================== */
const addBrand = catchAsync(async (req, res, next) => {
    const { brandName, isListed } = req.body;

    if (!brandName?.trim()) {
        return next(new AppError("Brand name is required", STATUS.BAD_REQUEST));
    }

    const existing = await Brand.findOne({
        brandName: { $regex: new RegExp(`^${brandName.trim()}$`, "i") }
    });

    if (existing) {
        return next(new AppError("Brand already exists", STATUS.CONFLICT));
    }

    if (!req.file) {
        return next(new AppError("Brand logo is required", STATUS.BAD_REQUEST));
    }

    // 1. Create the path string
    const logoPath = `/uploads/brand-logos/${req.file.filename}`;

    // 2. Save directly as string 
    const brand = await Brand.create({
        brandName: brandName.trim(),
        slug: slugify(brandName, { lower: true, strict: true, trim: true }),
        logo: logoPath,
        isListed: isListed === "on"
    });

    return successResponse(res, STATUS.CREATED, "Brand created successfully", brand);
});

/* ===========================================================
   GET BRAND BY ID
=========================================================== */
const getBrandById = catchAsync(async (req, res, next) => {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return next(new AppError("Brand not found", STATUS.NOT_FOUND));
    return successResponse(res, STATUS.OK, "Brand fetched", brand);
});

/* ===========================================================
   UPDATE BRAND 
=========================================================== */
const updateBrand = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { brandName, isListed } = req.body;

    const brand = await Brand.findById(id);
    if (!brand) return next(new AppError("Brand not found", STATUS.NOT_FOUND));

    const duplicate = await Brand.findOne({
        brandName: { $regex: new RegExp(`^${brandName.trim()}$`, "i") },
        _id: { $ne: id }
    });

    if (duplicate) return next(new AppError("Brand name already taken", STATUS.CONFLICT));

    brand.brandName = brandName.trim();
    brand.isListed = isListed === "on";

    if (req.file) {
        // Save directly as string
        brand.logo = `/uploads/brands/${req.file.filename}`;
    }

    await brand.save();

    return successResponse(res, STATUS.OK, "Brand updated successfully", brand);
});

/* ===========================================================
   TOGGLE STATUS
=========================================================== */
const toggleBrandStatus = catchAsync(async (req, res, next) => {
    const brand = await Brand.findById(req.params.id);
    if (!brand) return next(new AppError("Brand not found", STATUS.NOT_FOUND));

    brand.isListed = !brand.isListed;
    await brand.save();

    return successResponse(res, STATUS.OK,
        brand.isListed ? "Brand listed successfully" : "Brand unlisted successfully",
        brand
    );
});


export default {
    getBrandPage,
    getBrandsData,
    addBrand,
    getBrandById,
    updateBrand,
    toggleBrandStatus
};
