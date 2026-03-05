import Category from "../../models/categorySchema.js";
import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";

const CATEGORIES_PER_PAGE = 10;

const getCategoriesList = async (page = 1, limit = CATEGORIES_PER_PAGE, search = "", status = "") => {
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
        { $project: { products: 0 } },
        { $sort: { createdAt: -1 } },
        { $skip: (safePage - 1) * limit },
        { $limit: limit }
    ]);

    return {
        categories,
        pagination: {
            page: safePage,
            totalPages,
            totalCategories,
            limit,
        },
    };
};

const addCategory = async (categoryData) => {
    const { name, description, isListed } = categoryData;

    if (!name?.trim()) {
        throw new AppError("Category name is required", STATUS.BAD_REQUEST);
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({ 
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } 
    });
    if (existing) {
        throw new AppError(`Category "${trimmedName}" already exists. Please choose a different name.`, STATUS.CONFLICT);
    }

    const category = await Category.create({
        name: trimmedName,
        description: description?.trim() || "",
        isListed: isListed === "on"
    });

    return category;
};

const updateCategory = async (categoryId, categoryData) => {
    const { name, description, isListed } = categoryData;

    const category = await Category.findById(categoryId);
    if (!category) throw new AppError("Category not found", STATUS.NOT_FOUND);

    const trimmedName = name.trim();
    const duplicate = await Category.findOne({ 
        name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }, 
        _id: { $ne: categoryId } 
    });
    if (duplicate) throw new AppError(`Category "${trimmedName}" already exists. Please choose a different name.`, STATUS.CONFLICT);

    category.name = trimmedName;
    category.description = description?.trim() || "";
    category.isListed = isListed === "on";

    await category.save();

    return category;
};

const unlistCategory = async (categoryId) => {
    const category = await Category.findById(categoryId);
    if (!category) throw new AppError("Category not found", STATUS.NOT_FOUND);

    category.isListed = false;
    await category.save();

    return category;
};

const toggleListCategory = async (categoryId) => {
    const category = await Category.findById(categoryId);
    if (!category) throw new AppError("Category not found", STATUS.NOT_FOUND);

    category.isListed = !category.isListed;
    await category.save();

    return category;
};

export default {
    getCategoriesList,
    addCategory,
    updateCategory,
    unlistCategory,
    toggleListCategory
};
