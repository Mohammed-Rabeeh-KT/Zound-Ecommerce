import { catchAsync } from "../../../utils/catchAsync.js";
import productService from "../../../services/admin/productService.js";

const getProductPage = catchAsync(async (req, res) => {
  // RENDER PAGES
  const data = await productService.getProductPageData(req.query);

  res.render("admin/productManagement", {
    currentPage: "products",
    adminName: req.session.admin?.name || "Admin",
    ...data
  });
});

const getProductDetailsPage = catchAsync(async (req, res, next) => {
  const data = await productService.getProductDetailsPageData(req.params.id);

  res.render("admin/productDetails", {
    currentPage: "products",
    adminName: req.session.admin?.name || "Admin",
    ...data
  });
});

export default {
  getProductPage,
  getProductDetailsPage
};