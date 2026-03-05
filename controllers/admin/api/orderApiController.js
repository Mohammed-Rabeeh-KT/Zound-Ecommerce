import { catchAsync } from "../../../utils/catchAsync.js";
import { successResponse, errorResponse, STATUS } from "../../../utils/response.js";
import orderService from "../../../services/admin/orderService.js";

const updateOrderStatus = catchAsync(async (req, res, next) => {
    await orderService.updateOrderStatus(req.body.orderId, req.body.status);
        return successResponse(res, STATUS.OK, 'Order status updated successfully');
});

// Handle return request (approve/reject)
const handleReturnRequest = catchAsync(async (req, res, next) => {
    const action = await orderService.handleReturnRequest(
            req.body.orderId,
            req.body.itemId,
            req.body.action,
            req.body.rejectReason
        );

        const message = action === 'approve'
            ? 'Return request approved successfully'
            : 'Return request rejected';

        return successResponse(res, STATUS.OK, message);
});

// Update individual item status
const updateItemStatus = catchAsync(async (req, res, next) => {
    await orderService.updateItemStatus(req.body.orderId, req.body.itemId, req.body.status);
        return successResponse(res, STATUS.OK, 'Item status updated successfully');
});

export default {
    updateOrderStatus,
    handleReturnRequest,
    updateItemStatus
};
