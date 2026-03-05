import { catchAsync } from "../../../utils/catchAsync.js";
import { errorResponse, successResponse, STATUS } from "../../../utils/response.js";
import productService from "../../../services/admin/productService.js";

// ==========================================
// API / ACTIONS
// ==========================================

const addProduct = catchAsync(async (req, res, next) => {
    const newProduct = await productService.addProduct(req.body, req.files);
        return successResponse(res, STATUS.CREATED, "Product created successfully", newProduct);
});

const getProductById = catchAsync(async (req, res, next) => {
    const product = await productService.getProductById(req.params.id);
        return successResponse(res, STATUS.OK, "Product details", product);
});

const updateProduct = catchAsync(async (req, res, next) => {
    const product = await productService.updateProduct(req.params.id, req.body, req.files);
        return successResponse(res, STATUS.OK, "Product updated successfully", product);
});

const toggleProductStatus = catchAsync(async (req, res, next) => {
    const product = await productService.toggleProductStatus(req.params.id);
        return successResponse(res, 200, `Product ${product.status} successfully`, { status: product.status });
});

const softDeleteProduct = catchAsync(async (req, res, next) => {
    await productService.softDeleteProduct(req.params.id);
        return successResponse(res, STATUS.OK, "Product deleted");
});

const deleteVariant = catchAsync(async (req, res, next) => {
    await productService.deleteVariant(req.body.productId, req.body.variantId);
        return successResponse(res, STATUS.OK, "Variant deleted successfully");
});

const toggleVariantStatus = catchAsync(async (req, res, next) => {
    await productService.toggleVariantStatus(req.body.productId, req.body.variantId, req.body.status);
        return successResponse(res, STATUS.OK, "Variant status updated");
});

export default {
    addProduct,
    getProductById,
    updateProduct,
    toggleProductStatus,
    softDeleteProduct,
    deleteVariant,
    toggleVariantStatus
};
