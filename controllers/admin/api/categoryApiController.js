import { catchAsync } from "../../../utils/catchAsync.js";
import { successResponse, STATUS } from "../../../utils/response.js";
import categoryService from "../../../services/admin/categoryService.js";

// FETCH DATA (AJAX)
const getCategoriesData = catchAsync(async (req, res, next) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search || "").trim();
    const status = req.query.status || "";

    const data = await categoryService.getCategoriesList(page, limit, search, status);

    return successResponse(res, STATUS.OK, "Categories fetched", data);
});

// ADD CATEGORY
const addCategory = catchAsync(async (req, res, next) => {
    const { name, description, isListed } = req.body;

    const category = await categoryService.addCategory({ name, description, isListed });

    return res.status(STATUS.CREATED).json({
        success: true,
        message: "Category added successfully",
        data: category
    });
});

// UPDATE CATEGORY
const updateCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, description, isListed } = req.body;

    const category = await categoryService.updateCategory(id, { name, description, isListed });

    return successResponse(res, STATUS.OK, "Category updated successfully", category);
});

// SOFT DELETE (UNLIST)
const unlistCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const category = await categoryService.unlistCategory(id);

    return successResponse(res, STATUS.OK, "Category unlisted successfully", category);
});

// TOGGLE STATUS: LIST / UNLIST
const toggleListCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const category = await categoryService.toggleListCategory(id);

    return successResponse(
        res,
        STATUS.OK,
        category.isListed ? "Category listed successfully" : "Category unlisted successfully",
        category
    );
});

export default {
    getCategoriesData,
    addCategory,
    updateCategory,
    unlistCategory,
    toggleListCategory
};
