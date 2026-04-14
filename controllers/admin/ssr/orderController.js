import { catchAsync } from "../../../utils/catchAsync.js";
import orderService from "../../../services/admin/orderService.js";

const getOrderManagement = catchAsync(async (req, res, next) => {
    const { page, search, status , paymentMethod , date} = req.query;

    const data = await orderService.getOrderManagementPageData(page, search, status , paymentMethod , date);

    res.render('admin/orderManagement', {
        ...data,
        currentPage: 'orders'
    });
});

const getOrderDetails = catchAsync(async (req, res, next) => {
    const { orderId } = req.params;

    const order = await orderService.getOrderDetailsPageData(orderId);

    res.render('admin/orderDetails', {
        order,
        layout: 'adminLayout',
        currentPage: 'orders'
    });
});

export default {
    getOrderManagement,
    getOrderDetails
};
