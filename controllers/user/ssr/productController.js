import { catchAsync } from "../../../utils/catchAsync.js";
import productService from "../../../services/user/productService.js";

const getProductListing = catchAsync(async (req, res, next) => {
    const data = await productService.getProductListingData(req.query);

    if (data.invalidCategory) {
        return res.redirect('/user/products');
    }

    if (req.xhr) {
        return res.json({
            products: data.processedProducts,
            currentPage: data.currentPage,
            totalPages: data.totalPages,
            totalProducts: data.totalProducts
        });
    }

    res.render("user/productListing", {
        allCategories: data.allCategories,
        allBrands: data.allBrands,
        pageTitle: data.pageTitle,
        pageDescription: data.pageDescription,
        products: data.processedProducts,
        totalProducts: data.totalProducts,
        totalStock: data.totalStock,
        searchQuery: data.searchQuery,
        sortBy: data.sortBy,
        selectedFilters: req.query,
        currentPage: data.currentPage,
        totalPages: data.totalPages
    });
});

const getProductDetails = catchAsync(async (req, res, next) => {
    const productSlug = req.params.slug;

    const data = await productService.getProductDetailsData(productSlug);

    if (data.unavailable) {
        if (data.reason === "outOfStock") {
            return res.status(404).render("user/productUnavailable", {
                title: "Out of Stock",
                message: "This product is currently out of stock."
            });
        }
        return res.status(404).render("user/productUnavailable", {
            title: "Product Unavailable",
            message: "This item is no longer available."
        });
    }

    res.render('user/productDetails', {
        product: data.product,
        relatedProducts: data.relatedProducts,
        firstVariant: data.firstVariant,
        pageTitle: data.pageTitle,
        searchQuery: data.searchQuery,
        selectedFilters: data.selectedFilters
    });
});

export default {
    getProductListing,
    getProductDetails
};
