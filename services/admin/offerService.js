import Offer from "../../models/offerSchema.js";
import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";

const searchProducts = async (q) => {
    if (!q || q.trim().length < 1) {
        return [];
    }

    const products = await Product.find({
        productName: { $regex: q, $options: 'i' },
        isDeleted: false,
        status: 'Active'
    })
        .select('_id productName')
        .limit(10)
        .lean();

    return products;
};

const validateOfferBase = (data) => {
    const { name, discountType, discountValue, startOn, expireOn, minPurchaseAmount } = data;

    // Name validation
    const trimmedName = name?.trim();
    if (!trimmedName) {
        throw new AppError('Offer name is required', STATUS.BAD_REQUEST);
    }

    if (trimmedName.length < 3) {
        throw new AppError('Offer name must be at least 3 characters long', STATUS.BAD_REQUEST);
    }

    if (trimmedName.length > 100) {
        throw new AppError('Offer name cannot exceed 100 characters', STATUS.BAD_REQUEST);
    }

    // Required fields validation
    if (!discountType || !discountValue || !startOn || !expireOn) {
        throw new AppError('All fields are required', STATUS.BAD_REQUEST);
    }

    // Discount value validation
    const discountNum = parseFloat(discountValue);
    if (isNaN(discountNum) || discountNum < 1) {
        throw new AppError('Discount value must be at least 1', STATUS.BAD_REQUEST);
    }

    if (discountType === 'percentage') {
        if (discountNum > 99) {
            throw new AppError('Percentage discount must be between 1% and 99%', STATUS.BAD_REQUEST);
        }
        if (discountNum < 1) {
            throw new AppError('Percentage discount must be at least 1%', STATUS.BAD_REQUEST);
        }
    }

    if (discountType === 'fixed') {
        if (discountNum > 50000) {
            throw new AppError('Fixed discount cannot exceed ₹50,000', STATUS.BAD_REQUEST);
        }
        if (discountNum < 1) {
            throw new AppError('Fixed discount must be at least ₹1', STATUS.BAD_REQUEST);
        }
    }

    // Minimum purchase validation
    const minPurchase = parseFloat(minPurchaseAmount) || 0;
    if (minPurchase < 0) {
        throw new AppError('Minimum purchase amount cannot be negative', STATUS.BAD_REQUEST);
    }

    // Validate discount amount vs minimum purchase
    if (discountType === 'fixed' && discountNum >= minPurchase && minPurchase > 0) {
        throw new AppError('Fixed discount amount must be less than minimum purchase amount', STATUS.BAD_REQUEST);
    }

    // Date validation
    const startDate = new Date(startOn);
    const endDate = new Date(expireOn);
    const now = new Date();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new AppError('Invalid date format', STATUS.BAD_REQUEST);
    }

    if (endDate <= startDate) {
        throw new AppError('End date must be after start date', STATUS.BAD_REQUEST);
    }

    if (startDate < now) {
        throw new AppError('Start date cannot be in the past', STATUS.BAD_REQUEST);
    }

    if (endDate < now) {
        throw new AppError('End date cannot be in the past', STATUS.BAD_REQUEST);
    }

    // Check if offer duration is reasonable (not too long)
    const durationInDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (durationInDays > 365) {
        throw new AppError('Offer duration cannot exceed 365 days', STATUS.BAD_REQUEST);
    }

    if (durationInDays < 1) {
        throw new AppError('Offer duration must be at least 1 day', STATUS.BAD_REQUEST);
    }

    return { discountNum, startDate, endDate, minPurchase, trimmedName };
};

const checkMaxDiscountLimit = (product, discountNum, discountType) => {
    if (discountType === 'fixed' && product && product.variants && product.variants.length > 0) {
        const activeVariants = product.variants.filter(v => v.status === 'Active');
        if (activeVariants.length > 0) {
            const minVariantPrice = Math.min(...activeVariants.map(v => v.salePrice));
            const maxAllowedDiscount = minVariantPrice * 0.90;

            if (discountNum > maxAllowedDiscount) {
                throw new AppError(
                    `Discount amount ₹${discountNum} exceeds 90% of the minimum variant price (₹${minVariantPrice}). Maximum allowed: ₹${Math.floor(maxAllowedDiscount)}`,
                    STATUS.BAD_REQUEST
                );
            }
        }
    }
};

const addProductOffer = async (data) => {
    const { productId } = data;

    if (!productId) throw new AppError('Product selection is required', STATUS.BAD_REQUEST);
    
    const { discountNum, startDate, endDate, minPurchase, trimmedName } = validateOfferBase(data);

    const product = await Product.findById(productId);
    if (!product) {
        throw new AppError('Selected product not found', STATUS.NOT_FOUND);
    }

    if (product.isDeleted || product.status !== 'Active') {
        throw new AppError('Cannot create offer for inactive or deleted product', STATUS.BAD_REQUEST);
    }

    checkMaxDiscountLimit(product, discountNum, data.discountType);

    const existingOffer = await Offer.findOne({
        productId,
        apply_for: 'product',
        ends_at: { $gte: new Date() },
        isActive: true
    });

    if (existingOffer) {
        throw new AppError(`An active offer already exists for product "${product.productName}". Please edit the existing offer instead.`, STATUS.CONFLICT);
    }

    const newOffer = new Offer({
        title: trimmedName,
        discount_value: discountNum,
        discount_type: data.discountType,
        apply_for: 'product',
        productId,
        starts_at: startDate,
        ends_at: endDate,
        min_purchase_amount: minPurchase,
        isActive: true
    });

    await newOffer.save();
    return newOffer;
};

const addCategoryOffer = async (data) => {
    const { name, categoryId, discountType, discountValue, startOn, expireOn, minPurchaseAmount } = data;

    if (!categoryId) throw new AppError('All fields are required', STATUS.BAD_REQUEST);
    const { discountNum, startDate, endDate } = validateOfferBase(data);

    const existingOffer = await Offer.findOne({
        categoryId,
        apply_for: 'category',
        ends_at: { $gte: new Date() },
        isActive: true
    });

    if (existingOffer) {
        throw new AppError('An active offer already exists for this category', STATUS.CONFLICT);
    }

    const newOffer = new Offer({
        title: name,
        discount_value: discountNum,
        discount_type: discountType,
        apply_for: 'category',
        categoryId,
        starts_at: startDate,
        ends_at: endDate,
        min_purchase_amount: minPurchase,
        isActive: true
    });

    await newOffer.save();
    await Category.findByIdAndUpdate(categoryId, { offer_id: newOffer._id });
    return newOffer;
};

const addBrandOffer = async (data) => {
    const { name, brandId, discountType, discountValue, startOn, expireOn, minPurchaseAmount } = data;

    if (!brandId) throw new AppError('All fields are required', STATUS.BAD_REQUEST);
    const { discountNum, startDate, endDate } = validateOfferBase(data);

    const existingOffer = await Offer.findOne({
        brandId,
        apply_for: 'brand',
        ends_at: { $gte: new Date() },
        isActive: true
    });

    if (existingOffer) {
        throw new AppError('An active offer already exists for this brand', STATUS.CONFLICT);
    }

    const newOffer = new Offer({
        title: name,
        discount_value: discountNum,
        discount_type: discountType,
        apply_for: 'brand',
        brandId,
        starts_at: startDate,
        ends_at: endDate,
        min_purchase_amount: minPurchase,
        isActive: true
    });

    await newOffer.save();
    return newOffer;
};

const deleteOffer = async (offerId) => {
    if (!offerId) throw new AppError('Offer ID is required', STATUS.BAD_REQUEST);

    const offer = await Offer.findById(offerId);
    if (!offer) {
        throw new AppError('Offer not found', STATUS.NOT_FOUND);
    }

    if (offer.apply_for === 'category' && offer.categoryId) {
        await Category.findByIdAndUpdate(offer.categoryId, { offer_id: null });
    }

    await Offer.findByIdAndDelete(offerId);
    return true;
};

const toggleOfferStatus = async (offerId) => {
    if (!offerId) throw new AppError('Offer ID is required', STATUS.BAD_REQUEST);

    const offer = await Offer.findById(offerId);
    if (!offer) {
        throw new AppError('Offer not found', STATUS.NOT_FOUND);
    }

    const now = new Date();
    const endDate = new Date(offer.ends_at);
    if (endDate < now && !offer.isActive) {
        throw new AppError('Cannot activate an expired offer. Please extend the end date first.', STATUS.BAD_REQUEST);
    }

    if (!offer.isActive) {
        let checkQuery = {
            _id: { $ne: offerId },
            apply_for: offer.apply_for,
            isActive: true,
            ends_at: { $gte: now }
        };

        if (offer.apply_for === 'product') {
            checkQuery.productId = offer.productId;
        } else if (offer.apply_for === 'category') {
            checkQuery.categoryId = offer.categoryId;
        } else if (offer.apply_for === 'brand') {
            checkQuery.brandId = offer.brandId;
        }

        const duplicateOffer = await Offer.findOne(checkQuery);
        if (duplicateOffer) {
            throw new AppError(`Another active offer "${duplicateOffer.title}" already exists for this ${offer.apply_for}`, STATUS.CONFLICT);
        }
    }

    offer.isActive = !offer.isActive;
    await offer.save();

    return offer;
};

const updateOffer = async (offerId, data) => {
    if (!offerId) throw new AppError('Offer ID is required', STATUS.BAD_REQUEST);

    const offer = await Offer.findById(offerId);
    if (!offer) {
        throw new AppError('Offer not found', STATUS.NOT_FOUND);
    }

    const { name, discountType, discountValue, startOn, expireOn } = data;

    const discountNum = parseFloat(discountValue);
    if (isNaN(discountNum) || discountNum < 1) {
        throw new AppError('Invalid discount value', STATUS.BAD_REQUEST);
    }

    if (discountType === 'percentage' && discountNum > 99) {
        throw new AppError('Percentage must be between 1 and 99', STATUS.BAD_REQUEST);
    }

    const startDate = new Date(startOn);
    const endDate = new Date(expireOn);
    if (endDate <= startDate) {
        throw new AppError('End date must be after start date', STATUS.BAD_REQUEST);
    }

    if (offer.apply_for === 'product' && discountType === 'fixed' && offer.productId) {
        const product = await Product.findById(offer.productId);
        checkMaxDiscountLimit(product, discountNum, discountType);
    }

    offer.title = name || offer.title;
    offer.discount_type = discountType || offer.discount_type;
    offer.discount_value = discountNum || offer.discount_value;
    offer.starts_at = startDate || offer.starts_at;
    offer.ends_at = endDate || offer.ends_at;

    await offer.save();
    return offer;
};

const getOfferManagementPageData = async () => {
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

    return {
        productOffers: formattedProductOffers,
        categoryOffers: formattedCategoryOffers,
        brandOffers: formattedBrandOffers,
        categories,
        brands
    };
};

// =====================================================
// HELPER: Get best offer for a product (used internally)
// =====================================================
const getBestOfferForProduct = async (productId, categoryId, brandId, productPrice = 0) => {
    const now = new Date();

    const baseQuery = {
        starts_at: { $lte: now },
        ends_at: { $gte: now },
        isActive: true
    };

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
    ]);

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
            originalPrice: basePrice,
            salePrice: salePrice,
            finalPrice: salePrice,
            saleDiscountPercent: saleDiscountPercent,
            saleDiscountAmount: saleDiscountAmount,
            offerDiscountPercent: 0,
            offerDiscountAmount: 0,
            discount: 0,
            discountType: null,
            totalDiscountPercent: saleDiscountPercent,
            totalDiscountAmount: saleDiscountAmount,
            offerSource: null,
            offerTitle: null,
            offerId: null
        };
    }

    let offerDiscountAmount = 0;
    if (bestOffer.discount_type === 'percentage') {
        offerDiscountAmount = Math.round((salePrice * bestOffer.discount_value) / 100);
    } else {
        offerDiscountAmount = bestOffer.discount_value;
    }

    const finalPrice = Math.max(0, salePrice - offerDiscountAmount);
    const offerDiscountPercent = salePrice > 0
        ? Math.round((offerDiscountAmount / salePrice) * 100)
        : 0;

    const totalDiscountAmount = saleDiscountAmount + offerDiscountAmount;
    const totalDiscountPercent = basePrice > 0
        ? Math.round((totalDiscountAmount / basePrice) * 100)
        : 0;

    return {
        originalPrice: basePrice,
        salePrice: salePrice,
        finalPrice: finalPrice,
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

export default {
    searchProducts,
    addProductOffer,
    addCategoryOffer,
    addBrandOffer,
    deleteOffer,
    toggleOfferStatus,
    updateOffer,
    getOfferManagementPageData,
    getBestOfferForProduct,
    calculateOfferPrice
};
