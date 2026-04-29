import { catchAsync } from "../../../utils/catchAsync.js";
import { successResponse, STATUS } from "../../../utils/response.js";
import userManagementService from "../../../services/admin/userManagementService.js";

const getUsersData = catchAsync(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const startDate = req.query.startDate || "";
    const endDate = req.query.endDate || "";

    const data = await userManagementService.getUsersList(page, search, status, startDate, endDate);

    return res.json(data);
})

const blockUser = catchAsync(async (req, res, next) => {
    const userId = req.params.id;

    await userManagementService.blockUser(userId);

    return successResponse(res, STATUS.OK, "User blocked successfully");
})


const unblockUser = catchAsync(async (req, res, next) => {
    const userId = req.params.id;

    await userManagementService.unblockUser(userId);

    return successResponse(res, STATUS.OK, "User unblocked successfully");
})


export default {
    getUsersData,
    blockUser,
    unblockUser
};
