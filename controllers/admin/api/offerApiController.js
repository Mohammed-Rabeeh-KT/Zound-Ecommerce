import { catchAsync } from "../../../utils/catchAsync.js";
import { successResponse, errorResponse, STATUS } from "../../../utils/response.js";
import offerService from "../../../services/admin/offerService.js";

// SEARCH PRODUCTS (AJAX for autocomplete)
const searchProducts = catchAsync(async (req, res, next) => {
    const products = await offerService.searchProducts(req.query.q);
        return successResponse(res, STATUS.OK, 'Products fetched', products);
});

const addProductOffer = catchAsync(async (req, res, next) => {
    const newOffer = await offerService.addProductOffer(req.body);
        return successResponse(res, STATUS.CREATED, 'Product offer created successfully', newOffer);
});

const addCategoryOffer = catchAsync(async (req, res, next) => {
    const newOffer = await offerService.addCategoryOffer(req.body);
        return successResponse(res, STATUS.CREATED, 'Category offer created successfully', newOffer);
});

const addBrandOffer = catchAsync(async (req, res, next) => {
    const newOffer = await offerService.addBrandOffer(req.body);
        return successResponse(res, STATUS.CREATED, 'Brand offer created successfully', newOffer);
});

// DELETE OFFER
const deleteOffer = catchAsync(async (req, res, next) => {
    await offerService.deleteOffer(req.params.offerId);
        return successResponse(res, STATUS.OK, 'Offer deleted successfully');
});

const toggleOfferStatus = catchAsync(async (req, res, next) => {
    const offer = await offerService.toggleOfferStatus(req.params.offerId);
        const statusText = offer.isActive ? 'activated' : 'deactivated';
        return successResponse(res, STATUS.OK, `Offer ${statusText} successfully`, { isActive: offer.isActive });
});

const updateOffer = catchAsync(async (req, res, next) => {
    const offer = await offerService.updateOffer(req.params.offerId, req.body);
        return successResponse(res, STATUS.OK, 'Offer updated successfully', offer);
});

export default {
    searchProducts,
    addProductOffer,
    addCategoryOffer,
    addBrandOffer,
    deleteOffer,
    updateOffer,
    toggleOfferStatus
};
