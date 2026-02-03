import Offer from '../../models/offerSchema.js';
import Product from '../../models/productSchema.js';
import Category from '../../models/categorySchema.js';
import Brand from '../../models/brandSchema.js';
import User from '../../models/userSchema.js';
import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import { successResponse, errorResponse, STATUS, MESSAGE } from "../../utils/response.js";

const getOfferManagement = catchAsync(async (req, res, next) => {
    const productOffers = await Offer.find({ apply_for: "product" })
        .populate('productId', 'productName')
        .sort({ createdAt: -1 })
        .lean();

    const formattedProductOffers = productOffers.map(offer => ({
        _id: offer._id,
        name: offer.title,
        productName: offer.productId?.productName || "Unknown Product",
        discountValue: offer.discount_value,
        discountType: offer.discount_type,
        startOn: offer.starts_at,
        expireOn: offer.ends_at,
        createdAt: offer.createdAt,
        isActive: offer.isActive
    }));

    const categoryOffers = await Offer.find({ apply_for: "category" })
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .lean();

    const formattedCategoryOffers = categoryOffers.map(offer => ({
        _id: offer._id,
        name: offer.title,
        categoryName: offer.categoryId?.name || 'Category',
        discountValue: offer.discount_value,
        discountType: offer.discount_type,
        startOn: offer.starts_at,
        expireOn: offer.ends_at,
        createdAt: offer.createdAt,
        isActive: offer.isActive
    }));

    // Get all brand offers with brand details
    const brandOffers = await Offer.find({ apply_for: 'brand' })
        .populate('brandId', 'brandName')
        .sort({ createdAt: -1 })
        .lean();

    const formattedBrandOffers = brandOffers.map(offer => ({
        _id: offer._id,
        name: offer.title,
        brandName: offer.brandId?.brandName || 'Brand Deleted',
        discountValue: offer.discount_value,
        discountType: offer.discount_type,
        startOn: offer.starts_at,
        expireOn: offer.ends_at,
        createdAt: offer.createdAt,
        isActive: offer.isActive
    }));


    // Get all categories and brands for dropdowns
    const categories = await Category.find({ isListed: true })
        .select('_id name')
        .lean();
    const brands = await Brand.find({ isListed: true })
        .select('_id brandName')
        .lean();

    const totalReferrals = await User.countDocuments({ referredBy: { $ne: null } });
    const referralOffer = {
        referrerReward: 100,
        refereeReward: 50,
        description: 'Invite your friends and earn rewards!',

    }

    res.render('admin/offerManagement', {
        productOffers: formattedProductOffers,
        categoryOffers: formattedCategoryOffers,
        brandOffers: formattedBrandOffers,
        categories,
        brands,
        referralOffer,
        totalReferrals,
        adminName: req.session.adminName || 'Admin',
        adminEmail: req.session.adminEmail || '',
        currentPage: 'offers'
    })
});

// SEARCH PRODUCTS (AJAX for autocomplete)
const searchProducts = catchAsync(async (req, res, next) => {
    const { q } = req.query;

    if (!q || q.trim().length < 1) {
        return successResponse(res, STATUS.OK, 'Products fetched', [])
    }

    const products = await Product.find({
        productName: { $regex: q, $options: 'i' },
        isDeleted: false,
        status: 'Active'
    })
        .select('_id productName')
        .limit(10)
        .lean();

    return successResponse(res, STATUS.OK, 'Products fetched', products)
})


const addProductOffer = catchAsync(async (req, res, next) => {
    const { name, productId, discountType, discountValue, startOn, expireOn } = req.body;

    // Validation
    if (!name || !productId || !discountType || !discountValue || !startOn || !expireOn) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'All fields are required');
    }

    const discountNum = parseFloat(discountValue);
    if (isNaN(discountNum) || discountNum < 1) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Invalid discount value');
    }

    if (discountType === 'percentage' && discountNum > 99) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Percentage must be between 1 and 99');
    }

    // Validate dates
    const startDate = new Date(startOn);
    const endDate = new Date(expireOn);
    if (endDate <= startDate) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'End date must be after start date');
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Product not found');
    }

    // Check for existing active offer on this product
    const existingOffer = await Offer.findOne({
        productId,
        apply_for: 'product',
        ends_at: { $gte: new Date() },
        isActive: true
    });

    if (existingOffer) {
        return errorResponse(res, STATUS.CONFLICT, 'An active offer already exists for this product');
    }

    //Create new offer 
    const newOffer = new Offer({
        title: name,
        discount_value: discountNum,
        discount_type: discountType,
        apply_for: 'product',
        productId,
        starts_at: new Date(startOn),
        ends_at: new Date(expireOn),
        isActive: true
    });

    await newOffer.save();
    return successResponse(res, STATUS.CREATED, 'Product offer created successfully', newOffer)
});

const addCategoryOffer = catchAsync(async (req, res, next) => {
    const { name, categoryId, discountType, discountValue, startOn, expireOn } = req.body;
    // Validation
    if (!name || !categoryId || !discountType || !discountValue || !startOn || !expireOn) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'All fields are required');
    }
    const discountNum = parseFloat(discountValue);
    if (isNaN(discountNum) || discountNum < 1) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Invalid discount value');
    }
    if (discountType === 'percentage' && discountNum > 99) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Percentage must be between 1 and 99');
    }

    // Validate dates
    const startDate = new Date(startOn);
    const endDate = new Date(expireOn);
    if (endDate <= startDate) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'End date must be after start date');
    }

    const category = await Category.findById(categoryId);
    if (!category) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Category not found');
    }

    const existingOffer = await Offer.findOne({
        categoryId,
        apply_for: 'category',
        ends_at: { $gte: new Date() },
        isActive: true
    });
    if (existingOffer) {
        return errorResponse(res, STATUS.CONFLICT, 'An active offer already exists for this category');
    }

    const newOffer = new Offer({
        title: name,
        discount_value: discountNum,
        discount_type: discountType,
        apply_for: 'category',
        categoryId,
        starts_at: new Date(startOn),
        ends_at: new Date(expireOn),
        isActive: true
    });

    await newOffer.save();
    await Category.findByIdAndUpdate(categoryId, { offer_id: newOffer._id });
    return successResponse(res, STATUS.CREATED, 'Category offer created successfully', newOffer);
});


const addBrandOffer = catchAsync(async (req, res, next) => {
    const { name, brandId, discountType, discountValue, startOn, expireOn } = req.body;

    if (!name || !brandId || !discountType || !discountValue || !startOn || !expireOn) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'All fields are required');
    }
    const discountNum = parseFloat(discountValue);
    if (isNaN(discountNum) || discountNum < 1) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Invalid discount value');
    }
    if (discountType === 'percentage' && discountNum > 99) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Percentage must be between 1 and 99');
    }

    // Validate dates
    const startDate = new Date(startOn);
    const endDate = new Date(expireOn);
    if (endDate <= startDate) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'End date must be after start date');
    }

    const brand = await Brand.findById(brandId);
    if (!brand) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Brand not found');
    }
    const existingOffer = await Offer.findOne({
        brandId,
        apply_for: 'brand',
        ends_at: { $gte: new Date() },
        isActive: true
    });

    if (existingOffer) {
        return errorResponse(res, STATUS.CONFLICT, 'An active offer already exists for this brand');
    }
    const newOffer = new Offer({
        title: name,
        discount_value: discountNum,
        discount_type: discountType,
        apply_for: 'brand',
        brandId,
        starts_at: new Date(startOn),
        ends_at: new Date(expireOn),
        isActive: true
    });
    await newOffer.save();
    return successResponse(res, STATUS.CREATED, 'Brand offer created successfully', newOffer);
});


// DELETE OFFER
const deleteOffer = catchAsync(async (req, res, next) => {
    const { offerId, type } = req.params;

    if (!offerId) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Offer ID is required')
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Offer not found');
    }

    if (offer.apply_for === 'category' && offer.categoryId) {
        await Category.findByIdAndUpdate(offer.categoryId, { offer_id: null });
    }
    await Offer.findByIdAndDelete(offerId);
    return successResponse(res, STATUS.OK, 'Offer deleted successfully');
});

// UPDATE REFERRAL CONFIGURATION
const updateReferralConfig = catchAsync(async (req, res, next) => {
    const { referrerReward, refereeReward, description } = req.body;

    // In production, store this in a Settings collection
    console.log('Referral Config Updated:', { referrerReward, refereeReward, description });

    res.redirect('/admin/offers');
})


const getBestOfferForProduct = async (productId, categoryId, brandId, productPrice = 0) => {
    const now = new Date();

    const baseQuery = {
        starts_at: { $lte: now },
        ends_at: { $gte: now },
        isActive: true
    }

    const [productOffer, categoryOffer, brandOffer] = await Promise.all([
        Offer.findOne({
            ...baseQuery,
            productId,
            apply_for: 'product'
        }).lean(),
        Offer.findOne({
            ...baseQuery,
            categoryId,
            apply_for: 'category'
        }).lean(),
        Offer.findOne({
            ...baseQuery,
            brandId,
            apply_for: 'brand'
        }).lean()
    ])

    // Collect all valid offers with their source
    const offers = [
        { offer: productOffer, source: 'product' },
        { offer: categoryOffer, source: 'category' },
        { offer: brandOffer, source: 'brand' }
    ].filter(o => o.offer);

    if (offers.length === 0) return null;

    // Calculate effective deduction for each offer
    const offersWithDeduction = offers.map(item => {
        let deduction = 0;
        if (item.offer.discount_type === 'percentage') {
            deduction = (productPrice * item.offer.discount_value) / 100;
        } else {
            deduction = item.offer.discount_value;
        }
        return { ...item, deduction }
    });


    const maxAllowedDiscount = productPrice * 0.9;

    // Filter out offers that exceed 90% discount
    const validOffers = offersWithDeduction.filter(item => {
        if (item.deduction > maxAllowedDiscount) {
            return false;
        }
        return true;
    });

    // If no valid offers remain after filtering, return null
    if (validOffers.length === 0) {
        return null;
    }

    // Pick the one with the highest deduction from valid offers
    const best = validOffers.reduce((prev, curr) =>
        curr.deduction > prev.deduction ? curr : prev
    );


    return {
        ...best.offer,
        source: best.source
    };
};


// CALCULATE OFFER PRICE FOR A PRODUCT
const calculateOfferPrice = async (product, variantIndex = 0) => {

    const variant = product.variants[variantIndex];
    const basePrice = variant?.basePrice || 0;
    const salePrice = variant?.salePrice || 0;

    const saleDiscountAmount = basePrice - salePrice;
    const saleDiscountPercent = basePrice > 0
        ? Math.round((saleDiscountAmount / basePrice) * 100)
        : 0;


    const bestOffer = await getBestOfferForProduct(
        product._id,
        product.category?._id || product.category,
        product.brand?._id || product.brand,
        salePrice
    );

    if (!bestOffer) {
        return {
            hasOffer: false,
            basePrice: basePrice,
            salePrice: salePrice,
            offerPrice: salePrice,
            saleDiscountPercent: saleDiscountPercent,
            offerDiscountPercent: 0,
            totalDiscountPercent: saleDiscountPercent,
            discount: 0,
            offerSource: null,
            offerTitle: null
        }
    }

    let offerDiscountAmount = 0;
    let offerDiscountPercent = 0;

    if (bestOffer.discount_type === "percentage") {
        offerDiscountPercent = bestOffer.discount_value;
        offerDiscountAmount = Math.round((salePrice * bestOffer.discount_value) / 100);
    } else {
        offerDiscountAmount = bestOffer.discount_value;
        offerDiscountPercent = salePrice > 0 ? Math.round((bestOffer.discount_value / salePrice) * 100) : 0;
    }

    const finalPrice = Math.max(0, Math.round(salePrice - offerDiscountAmount));

    const totalDiscountAmount = basePrice - finalPrice;
    const totalDiscountPercent = basePrice > 0
        ? Math.round((totalDiscountAmount / basePrice) * 100)
        : 0;

    return {
        hasOffer: true,
        basePrice: basePrice,
        salePrice: salePrice,
        offerPrice: finalPrice,
        saleDiscountPercent: saleDiscountPercent,
        saleDiscountAmount: saleDiscountAmount,
        offerDiscountPercent: offerDiscountPercent,
        offerDiscountAmount: offerDiscountAmount,
        discount: bestOffer.discount_value,
        discountType: bestOffer.discount_type,
        totalDiscountPercent: totalDiscountPercent,
        totalDiscountAmount: totalDiscountAmount,
        offerSource: bestOffer.source,
        offerTitle: bestOffer.title,
        offerId: bestOffer._id
    };
};

const toggleOfferStatus = catchAsync(async (req, res, next) => {
    const { offerId } = req.params;

    if (!offerId) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Offer ID is required')
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Offer not found')
    }

    // Check if offer is expired
    const now = new Date();
    const endDate = new Date(offer.ends_at);
    if (endDate < now && !offer.isActive) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Cannot activate an expired offer. Please extend the end date first.')
    }



    // If we are trying to ACTIVATE the offer, check for duplicates
    if (!offer.isActive) {
        // Check if another active offer exists for the same product/category/brand
        let checkQuery = {
            _id: { $ne: offerId },
            apply_for: offer.apply_for,
            isActive: true,
            ends_at: { $gte: now }
        }

        // Add the specific ID based on offer type
        if (offer.apply_for === 'product') {
            checkQuery.productId = offer.productId;
        } else if (offer.apply_for === 'category') {
            checkQuery.categoryId = offer.categoryId;
        } else if (offer.apply_for === 'brand') {
            checkQuery.brandId = offer.brandId;
        }

        const duplicateOffer = await Offer.findOne(checkQuery);
        if (duplicateOffer) {
            return errorResponse(
                res,
                STATUS.CONFLICT,
                `Another active offer "${duplicateOffer.title}" already exists for this ${offer.apply_for}`
            );
        }
    }

    // Toggle the status
    offer.isActive = !offer.isActive;
    await offer.save();

    const statusText = offer.isActive ? 'activated' : 'deactivated';

    return successResponse(res, STATUS.OK, `Offer ${statusText} successfully`, { isActive: offer.isActive });
});


const updateOffer = catchAsync(async (req, res, next) => {
    const { offerId } = req.params;
    const { name, discountType, discountValue, startOn, expireOn } = req.body;

    if (!offerId) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Offer ID is required')
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
        return errorResponse(res, STATUS.NOT_FOUND, 'Offer not found')
    }

    const discountNum = parseFloat(discountValue);
    if (isNaN(discountNum) || discountNum < 1) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Invalid discount value');
    }

    if (discountType === 'percentage' && discountNum > 99) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'Percentage must be between 1 and 99');
    }

    // Validate dates
    const startDate = new Date(startOn);
    const endDate = new Date(expireOn);
    if (endDate <= startDate) {
        return errorResponse(res, STATUS.BAD_REQUEST, 'End date must be after start date');
    }

    //update Offer
    offer.title = name || offer.title;
    offer.discount_type = discountType || offer.discount_type;
    offer.discount_value = discountNum || offer.discount_value;
    offer.starts_at = startDate || offer.starts_at;
    offer.ends_at = endDate || offer.ends_at;

    await offer.save();

    return successResponse(res, STATUS.OK, 'Offer updated successfully', offer);
})


export default {
    getOfferManagement,
    searchProducts,
    addProductOffer,
    addCategoryOffer,
    addBrandOffer,
    deleteOffer,
    updateOffer,
    toggleOfferStatus,
    updateReferralConfig,
    getBestOfferForProduct,
    calculateOfferPrice,
}   