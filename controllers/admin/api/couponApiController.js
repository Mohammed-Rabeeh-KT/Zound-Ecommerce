import { catchAsync } from '../../../utils/catchAsync.js';
import { successResponse, STATUS, errorResponse } from "../../../utils/response.js";
import couponService from "../../../services/admin/couponService.js";

const createCoupon = catchAsync(async (req, res, next) => {
    const coupon = await couponService.createCoupon(req.body);
        return successResponse(res, STATUS.CREATED, 'Coupon created successfully', { coupon });
});

const updateCoupon = catchAsync(async (req, res, next) => {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
        return successResponse(res, STATUS.OK, 'Coupon updated successfully', { coupon });
});

const toggleCouponStatus = catchAsync(async (req, res, next) => {
    const coupon = await couponService.toggleCouponStatus(req.params.id, req.body.isActive);
        return successResponse(res, STATUS.OK, `Coupon ${req.body.isActive ? 'activated' : 'deactivated'} successfully`, { coupon });
});

const getCouponById = catchAsync(async (req, res, next) => {
    const coupon = await couponService.getCouponById(req.params.id);
        return successResponse(res, STATUS.OK, 'Coupon fetched successfully', { coupon });
});

const deleteCoupon = catchAsync(async (req, res, next) => {
    await couponService.deleteCoupon(req.params.id);
        return successResponse(res, STATUS.OK, 'Coupon deleted successfully');
});

export default {
    getCouponById,
    createCoupon,
    updateCoupon,
    toggleCouponStatus,
    deleteCoupon
};
