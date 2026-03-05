import Coupon from "../../models/couponSchema.js";
import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";

const validateCouponData = (data) => {
    const { code, discountValue, discountType, startDate, endDate, minPurchase, maxDiscount, usageLimit, perUserLimit } = data;

    // Code validation
    const trimmedCode = code?.trim();
    if (!trimmedCode) {
        throw new AppError('Coupon code is required', STATUS.BAD_REQUEST);
    }

    const codeRegex = /^[A-Z0-9]{3,20}$/;
    if (!codeRegex.test(trimmedCode.toUpperCase())) {
        throw new AppError('Coupon code must be 3-20 alphanumeric characters only (no spaces or special characters)', STATUS.BAD_REQUEST);
    }

    // Discount value validation
    const discountNum = parseFloat(discountValue);
    if (!discountNum || discountNum <= 0) {
        throw new AppError('Discount value must be greater than 0', STATUS.BAD_REQUEST);
    }

    // Date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new AppError('Invalid date format', STATUS.BAD_REQUEST);
    }

    if (end <= start) {
        throw new AppError('End date must be after start date', STATUS.BAD_REQUEST);
    }

    if (end < now) {
        throw new AppError('End date cannot be in the past', STATUS.BAD_REQUEST);
    }

    // Discount type specific validation
    if (discountType === 'percentage') {
        if (discountNum > 99) {
            throw new AppError('Percentage discount cannot exceed 99%', STATUS.BAD_REQUEST);
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

    // Additional validations
    const minPurchaseNum = parseFloat(minPurchase) || 0;
    if (minPurchaseNum < 0) {
        throw new AppError('Minimum purchase amount cannot be negative', STATUS.BAD_REQUEST);
    }

    if (discountType === 'fixed' && discountNum >= minPurchaseNum && minPurchaseNum > 0) {
        throw new AppError('Fixed discount amount must be less than minimum purchase amount', STATUS.BAD_REQUEST);
    }

    const maxDiscountNum = parseFloat(maxDiscount);
    if (maxDiscount && maxDiscountNum <= 0) {
        throw new AppError('Maximum discount must be greater than 0', STATUS.BAD_REQUEST);
    }

    const usageLimitNum = parseInt(usageLimit);
    if (usageLimit && usageLimitNum <= 0) {
        throw new AppError('Usage limit must be greater than 0', STATUS.BAD_REQUEST);
    }

    const perUserLimitNum = parseInt(perUserLimit) || 1;
    if (perUserLimitNum <= 0) {
        throw new AppError('Per-user limit must be greater than 0', STATUS.BAD_REQUEST);
    }
};

const createCoupon = async (couponData) => {
    validateCouponData(couponData);

    const existingCoupon = await Coupon.findOne({ code: couponData.code.toUpperCase() });
    if (existingCoupon) {
        throw new AppError(`Coupon code "${couponData.code.toUpperCase()}" already exists. Please choose a different code.`, STATUS.BAD_REQUEST);
    }

    const coupon = new Coupon({
        ...couponData,
        code: couponData.code.toUpperCase(),
        minPurchase: couponData.minPurchase || 0,
        maxDiscount: couponData.maxDiscount || null,
        usageLimit: couponData.usageLimit || null,
        perUserLimit: couponData.perUserLimit || 1,
        isActive: true
    });

    await coupon.save();
    return coupon;
};

const updateCoupon = async (couponId, couponData) => {
    validateCouponData(couponData);

    const existingCoupon = await Coupon.findOne({
        code: couponData.code.toUpperCase(),
        _id: { $ne: couponId }
    });

    if (existingCoupon) {
        throw new AppError(`Coupon code "${couponData.code.toUpperCase()}" already exists. Please choose a different code.`, STATUS.BAD_REQUEST);
    }

    const coupon = await Coupon.findByIdAndUpdate(
        couponId,
        {
            ...couponData,
            code: couponData.code.toUpperCase(),
            minPurchase: couponData.minPurchase || 0,
            maxDiscount: couponData.maxDiscount || null,
            usageLimit: couponData.usageLimit || null,
            perUserLimit: couponData.perUserLimit || 1,
        },
        { new: true }
    );

    if (!coupon) throw new AppError('Coupon not found', STATUS.NOT_FOUND);

    return coupon;
};

const toggleCouponStatus = async (couponId, isActive) => {
    const coupon = await Coupon.findByIdAndUpdate(
        couponId,
        { isActive },
        { new: true }
    );

    if (!coupon) throw new AppError('Coupon not found', STATUS.NOT_FOUND);

    return coupon;
};

const getCouponById = async (couponId) => {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) throw new AppError('Coupon not found', STATUS.NOT_FOUND);
    return coupon;
};

const deleteCoupon = async (couponId) => {
    const coupon = await Coupon.findByIdAndDelete(couponId);
    if (!coupon) throw new AppError('Coupon not found', STATUS.NOT_FOUND);
    return coupon;
};

const getAllCoupons = async () => {
    return await Coupon.find().sort({ createdAt: -1 });
};

export default {
    createCoupon,
    updateCoupon,
    toggleCouponStatus,
    getCouponById,
    deleteCoupon,
    getAllCoupons
};
