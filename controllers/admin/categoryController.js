import Category from "../../models/categorySchema.js";
import Offer from "../../models/offerSchema.js";
import mongoose from "mongoose";
import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import {
    successResponse,
    errorResponse,
    STATUS,
    MESSAGE
} from "../../utils/response.js";

const CATEGORIES_PER_PAGE = 10;

// LOAD PAGE
const getCategoryPage = catchAsync(async (req, res) => {
    const search = req.query.search || "";
    const status = req.query.status || "";

    return res.render("admin/categoryManagement", {
        currentPage: "categories",
        adminName: req.session.admin?.name || "",
        search,
        status,
    });
});

// FETCH DATA (AJAX)
const getCategoriesData = catchAsync(async (req, res, next) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || CATEGORIES_PER_PAGE;
    const search = (req.query.search || "").trim();
    const status = req.query.status || "";

    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (status === "active") filter.isListed = true;
    if (status === "inactive") filter.isListed = false;

    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalCategories / limit));
    const safePage = Math.min(Math.max(page, 1), totalPages);

    const categories = await Category.aggregate([
        { $match: filter },
        {
            $lookup: {
                from: "products",
                let: { categoryId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$category", "$$categoryId"] },
                                    { $eq: ["$isDeleted", false] }
                                ]
                            }
                        }
                    }
                ],
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
        { $skip: (safePage - 1) * limit },
        { $limit: limit }
    ])



    return successResponse(res, STATUS.OK, "Categories fetched", {
        categories,
        pagination: {
            page: safePage,
            totalPages,
            totalCategories,
            limit,
        },
    });
});

// ADD CATEGORY
const addCategory = catchAsync(async (req, res, next) => {
    try {
        const { name, description } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category name is required"
            });
        }

        const existing = await Category.findOne({ name: name.trim() });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Category name already exists"
            });
        }

        const category = await Category.create({
            name: name.trim(),
            description: description?.trim() || "",
            isListed: req.body.isListed === "on"
        });

        return res.status(201).json({
            success: true,
            message: "Category added successfully",
            data: category
        });
    } catch (error) {
        console.error('Error adding category:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to add category. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// UPDATE CATEGORY
const updateCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, description } = req.body;

    const category = await Category.findById(id);
    if (!category) return next(new AppError("Category not found", STATUS.NOT_FOUND));

    const duplicate = await Category.findOne({ name, _id: { $ne: id } });
    if (duplicate) return next(new AppError("Category name already exists", STATUS.CONFLICT));

    category.name = name;
    category.description = description;
    category.isListed = req.body.isListed === "on";

    await category.save();

    return successResponse(res, STATUS.OK, "Category updated successfully", category);
});

// SOFT DELETE (UNLIST)
const unlistCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) return next(new AppError("Category not found", STATUS.NOT_FOUND));

    category.isListed = false;
    await category.save();

    return successResponse(res, STATUS.OK, "Category unlisted successfully", category);
});

// TOGGLE STATUS: LIST / UNLIST
const toggleListCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) return next(new AppError("Category not found", STATUS.NOT_FOUND));

    category.isListed = !category.isListed;
    await category.save();

    return successResponse(
        res,
        STATUS.OK,
        category.isListed ? "Category listed successfully" : "Category unlisted successfully",
        category
    );
});


export default {
    getCategoryPage,
    getCategoriesData,
    addCategory,
    updateCategory,
    unlistCategory,
    toggleListCategory
}