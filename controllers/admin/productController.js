import Category from "../../models/categorySchema.js";
import Product from "../../models/productSchema.js";
import mongoose from "mongoose";
import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import {
    successResponse,
    errorResponse,
    STATUS,
    MESSAGE
} from "../../utils/response.js";

 const getProducts = async (req, res, next) => {
  try {
    // Query params
    const search = req.query.search || "";
    const brand = req.query.brand || "";
    const category = req.query.category || "";
    const status = req.query.status || "";
    const sortBy = req.query.sortBy || "newest";

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Build filters
    let filter = { isDeleted: { $ne: true } };

    if (search) filter.productName = { $regex: search, $options: "i" };
    if (brand) filter["brand_id.brandName"] = brand;
    if (category) filter["category_id.categoryName"] = category;
    if (status) filter.status = status;

    // Sorting rules
    let sortQuery = {};
    switch (sortBy) {
      case "price-high":
        sortQuery.salePrice = -1;
        break;
      case "price-low":
        sortQuery.salePrice = 1;
        break;
      case "stock-high":
        sortQuery.stock = -1;
        break;
      case "name-az":
        sortQuery.productName = 1;
        break;
      default:
        sortQuery.createdAt = -1;
        break;
    }

    // Fetch products
    const totalProducts = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .populate("category_id")
      .populate("brand_id")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalProducts / limit);
    const startIndex = totalProducts > 0 ? skip + 1 : 0;
    const endIndex = Math.min(skip + limit, totalProducts);

    // SEND ALL VARIABLES REQUIRED BY EJS
    res.render("admin/productManagement", {
      layout: "layout",
      products,
      totalProducts,
      currentPage: page,
      totalPages,
      startIndex,
      endIndex,

      // IMPORTANT → Prevents "brand is not defined"
      search,
      brand,
      category,
      status,
      sortBy
    });

  } catch (err) {
    next(err);
  }
};



export default {
    getProducts
}