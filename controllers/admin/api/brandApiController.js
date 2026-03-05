import { catchAsync } from "../../../utils/catchAsync.js";
import AppError from "../../../utils/AppError.js";
import { successResponse, STATUS } from "../../../utils/response.js";
import brandService from "../../../services/admin/brandService.js";

/* ===========================================================
   FETCH BRANDS (AJAX)
=========================================================== */
const getBrandsData = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const search = req.query.search?.trim() || "";
    const status = req.query.status || "";

    const data = await brandService.getBrandsList(page, limit, search, status);

    return successResponse(res, STATUS.OK, "Brands fetched", data);
});

/* ===========================================================
   ADD NEW BRAND
=========================================================== */
const addBrand = catchAsync(async (req, res, next) => {
    const { brandName, isListed } = req.body;

    let logoPath = null;
    if (req.file) {
        logoPath = `/uploads/brand-logos/${req.file.filename}`;
    }

    const brand = await brandService.addBrand({ brandName, isListed, logoPath });

    return successResponse(res, STATUS.CREATED, "Brand created successfully", brand);
});

/* ===========================================================
   GET BRAND BY ID
=========================================================== */
const getBrandById = catchAsync(async (req, res, next) => {
    const brand = await brandService.getBrandById(req.params.id);
    return successResponse(res, STATUS.OK, "Brand fetched", brand);
});

/* ===========================================================
   UPDATE BRAND 
=========================================================== */
const updateBrand = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { brandName, isListed } = req.body;

    let logoPath = null;
    if (req.file) {
        logoPath = `/uploads/brands/${req.file.filename}`;
    }

    const brand = await brandService.updateBrand(id, { brandName, isListed, logoPath });

    return successResponse(res, STATUS.OK, "Brand updated successfully", brand);
});

/* ===========================================================
   TOGGLE STATUS
=========================================================== */
const toggleBrandStatus = catchAsync(async (req, res, next) => {
    const brand = await brandService.toggleBrandStatus(req.params.id);

    return successResponse(
        res,
        STATUS.OK,
        brand.isListed ? "Brand listed successfully" : "Brand unlisted successfully",
        brand
    );
});

export default {
    getBrandsData,
    addBrand,
    getBrandById,
    updateBrand,
    toggleBrandStatus
};
